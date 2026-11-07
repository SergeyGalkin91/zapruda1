import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowRight, Crown, ShieldCheck } from "lucide-react";
import {
  MobileField,
  SingleFieldProgress,
  SingleFieldStage,
  StickyFormActions,
} from "@/components/MobileForm";
import { supabase } from "@/integrations/supabase/client";
import { isSpotStaging, spotAction, spotToken } from "@/lib/spot-api";
import { clearReportHandoff, readReportHandoff } from "@/lib/report-big-fish-handoff";

type Spot = {
  id: string;
  name: string;
  city: string;
  disciplines: string[];
};
type CatchRow = {
  catch_id: string;
  league: string;
  species: string;
  weight_g: number;
  length_mm: number;
  status: string;
};
type QueueRow = CatchRow & {
  owner_id: string;
  spot_id: string;
  submitted_at: string;
};
type Notice = { id: number; message: string; created_at: string };

const applicationSteps = [
  "league",
  "species",
  "weight",
  "length",
  "time",
  "spot",
  "photo",
  "review",
] as const;
type ApplicationStep = (typeof applicationSteps)[number];

/** STAGING feature; deliberately unavailable in production until v0.7.5 security gates. */
export function SpotCatchFlow({ allowReportHandoff = false }: { allowReportHandoff?: boolean }) {
  const [uid, setUid] = useState("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [spotId, setSpotId] = useState("");
  const [league, setLeague] = useState<"street" | "ultralight">("street");
  const [species, setSpecies] = useState("pike");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [step, setStep] = useState<ApplicationStep>("league");
  const [editing, setEditing] = useState(false);
  const [reverse, setReverse] = useState(false);
  const submitting = useRef(false);
  const [capturedAt, setCapturedAt] = useState("");
  const [reviewChecked, setReviewChecked] = useState<Record<string, boolean>>({});
  const [microWelfareChecked, setMicroWelfareChecked] = useState<Record<string, boolean>>({});
  const [catches, setCatches] = useState<CatchRow[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [queue, setQueue] = useState<QueueRow[] | null>(null);
  const [reviewed, setReviewed] = useState<QueueRow[] | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [revokeChecked, setRevokeChecked] = useState<Record<string, boolean>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const allowed = isSpotStaging();
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    mounted.current = true;
    let authVersion = 0;
    const applyUser = (user: User | null) => {
      if (!active) return;
      const next = user && !user.is_anonymous && user.email_confirmed_at ? user.id : "";
      if (identity.current !== next) {
        generation.current++;
        setCatches([]);
        setNotices([]);
        setQueue(null);
        setReviewed(null);
        setEvidence({});
        setReviewChecked({});
        setMicroWelfareChecked({});
        setRevokeChecked({});
        setRevokeReasons({});
        setPhoto(null);
        setStep("league");
        setEditing(false);
        setReverse(false);
        submitting.current = false;
        setLeague("street");
        setSpecies("pike");
        setWeight("");
        setLength("");
        setCapturedAt("");
        setSpotId("");
        setMessage("");
        setBusy(false);
        if (next && allowReportHandoff) {
          const draft = readReportHandoff(next);
          const fish = draft && draft.selected !== null ? draft.fish[draft.selected] : undefined;
          if (fish) {
            setSpecies(fish.species);
            setWeight(String(fish.weight_g));
            setLength(fish.length_mm === null ? "" : String(fish.length_mm));
            setMessage(
              "Одна рыба перенесена из отчёта. Укажи время, проверенный спот и отдельное фото. Заявка ещё не отправлена.",
            );
          }
        }
      }
      identity.current = next;
      setUid(next);
    };
    const version = authVersion;
    void Promise.resolve()
      .then(() => supabase.auth.getUser())
      .then(({ data }) => {
        if (version === authVersion) applyUser(data.user);
      })
      .catch(() => {
        if (version === authVersion) applyUser(null);
      });
    let unsubscribe = () => {};
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        authVersion++;
        applyUser(session?.user ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      applyUser(null);
    }
    void (async () => {
      const { data } = await supabase
        .from("zc_public_spots")
        .select("id,name,city,disciplines")
        .eq("state", "approved")
        .order("city")
        .limit(100);
      if (!active) return;
      setSpots((data ?? []) as Spot[]);
    })().catch(() => {
      if (active) setSpots([]);
    });
    return () => {
      active = false;
      mounted.current = false;
      unsubscribe();
    };
  }, [allowed, allowReportHandoff]);

  const eligible = spots.filter((spot) => spot.disciplines.includes(league));

  async function refreshOwn() {
    const actor = identity.current,
      version = generation.current;
    if (!actor) return;
    try {
      const [my, inbox] = await Promise.all([
        spotAction<{ catches: CatchRow[] }>(actor, "mine"),
        spotAction<{ notifications: Notice[] }>(actor, "inbox"),
      ]);
      if (!mounted.current || identity.current !== actor || generation.current !== version) return;
      setCatches(my.catches ?? []);
      setNotices(inbox.notifications ?? []);
    } catch {
      if (mounted.current && identity.current === actor && generation.current === version)
        setMessage("Не удалось обновить уловы и уведомления. Попробуй ещё раз.");
    }
  }

  const position = applicationSteps.indexOf(step);
  const reviewing = step === "review";

  function changeStep(next: ApplicationStep, backward = false) {
    setReverse(backward);
    setStep(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current) return;
    if (!reviewing) {
      if (!event.currentTarget.reportValidity()) return;
      changeStep(editing ? "review" : applicationSteps[position + 1]!);
      setEditing(false);
      return;
    }
    if (!photo || !eligible.some((spot) => spot.id === spotId)) {
      setMessage("Выбери проверенный спот и добавь фотографию для заявки.");
      return;
    }
    const actor = identity.current,
      version = generation.current;
    if (!actor) return;
    const current = () =>
      mounted.current && identity.current === actor && generation.current === version;
    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("action", "submit");
      body.set("photo", photo);
      body.set("spot_id", spotId);
      body.set("league", league);
      body.set("species", species);
      body.set("weight_g", weight);
      body.set("length_mm", length);
      const parsedDate = new Date(capturedAt);
      if (!Number.isFinite(parsedDate.getTime())) throw new Error("Укажи дату поимки.");
      body.set("captured_at", parsedDate.toISOString());
      const token = await spotToken(actor);
      if (!current()) return;
      const { data, error } = await supabase.functions.invoke("zapruda-spot-records", {
        body,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!current()) return;
      if (error || data?.error) throw new Error("Заявка не принята сервером.");
      setMessage("Улов отправлен на проверку. Корона присваивается только после модерации.");
      setPhoto(null);
      changeStep("league");
      clearReportHandoff(actor);
      await refreshOwn();
      window.dispatchEvent(new Event("zapruda:spot-progress-changed"));
    } catch (err) {
      if (current()) setMessage(err instanceof Error ? err.message : "Не удалось отправить улов.");
    } finally {
      if (current()) {
        submitting.current = false;
        setBusy(false);
      }
    }
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const actor = identity.current,
      version = generation.current;
    if (!actor || busy) return;
    const current = () =>
      mounted.current && identity.current === actor && generation.current === version;
    setBusy(true);
    setMessage("");
    try {
      const result = await spotAction<{
        queue?: QueueRow[];
        url?: string;
        review?: { titles_changed: number };
      }>(actor, action, extra);
      if (!current()) return;
      if (action === "queue") setQueue(result.queue ?? []);
      if (action === "reviewed") setReviewed(result.queue ?? []);
      if (action === "evidence" && result.url && typeof extra["catch_id"] === "string") {
        setEvidence((old) => ({ ...old, [String(extra["catch_id"])]: result.url! }));
      }
      if (action === "review" || action === "revoke") {
        setMessage(
          (action === "revoke"
            ? "Подтверждение отозвано. Обновлено титулов: "
            : "Решение сохранено. Обновлено титулов: ") + (result.review?.titles_changed ?? 0),
        );
        const updated = await spotAction<{ queue: QueueRow[] }>(actor, "queue");
        if (!current()) return;
        setQueue(updated.queue ?? []);
        if (reviewed !== null) {
          const accepted = await spotAction<{ queue: QueueRow[] }>(actor, "reviewed");
          if (!current()) return;
          setReviewed(accepted.queue ?? []);
        }
        window.dispatchEvent(new Event("zapruda:spot-progress-changed"));
      }
      if (action === "subscribe") setMessage("Подписка на спот и выбранную дисциплину оформлена.");
      if (action === "mine" || action === "inbox" || action === "review" || action === "revoke")
        await refreshOwn();
    } catch (err) {
      if (current())
        setMessage(err instanceof Error ? err.message : "Не удалось выполнить действие.");
    } finally {
      if (current()) setBusy(false);
    }
  }

  if (!allowed) return null;

  const questions = {
    league: {
      title: "В какой дисциплине?",
      body: (
        <MobileField label="Дисциплина">
          <select
            value={league}
            onChange={(event) => {
              setLeague(event.target.value as "street" | "ultralight");
              setSpotId("");
            }}
            className="field"
          >
            <option value="street">STREET FISHING</option>
            <option value="ultralight">ULTRALIGHT / MICROJIG</option>
          </select>
        </MobileField>
      ),
    },
    species: {
      title: "Что поймал?",
      body: (
        <MobileField label="Вид рыбы">
          <select
            value={species}
            onChange={(event) => setSpecies(event.target.value)}
            className="field"
          >
            <option value="pike">Щука</option>
            <option value="zander">Судак</option>
            <option value="perch">Окунь</option>
            <option value="asp">Жерех</option>
            <option value="chub">Голавль</option>
          </select>
        </MobileField>
      ),
    },
    weight: {
      title: "Сколько весила рыба?",
      body: (
        <MobileField label="Вес одной рыбы, г">
          <input
            required
            min="1"
            max="200000"
            type="number"
            inputMode="numeric"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className="field"
          />
        </MobileField>
      ),
    },
    length: {
      title: "Какой длины была рыба?",
      body: (
        <MobileField label="Длина, мм">
          <input
            required
            min="1"
            max="4000"
            type="number"
            inputMode="numeric"
            value={length}
            onChange={(event) => setLength(event.target.value)}
            className="field"
          />
        </MobileField>
      ),
    },
    time: {
      title: "Когда поймал?",
      body: (
        <MobileField label="Дата и время поимки">
          <input
            type="datetime-local"
            required
            value={capturedAt}
            onChange={(event) => setCapturedAt(event.target.value)}
            className="field"
          />
        </MobileField>
      ),
    },
    spot: {
      title: "На каком споте?",
      body: (
        <MobileField label="Проверенный спот">
          <select
            value={spotId}
            required
            onChange={(event) => setSpotId(event.target.value)}
            className="field"
          >
            <option value="">Выбрать спот</option>
            {eligible.map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.name} · {spot.city}
              </option>
            ))}
          </select>
        </MobileField>
      ),
    },
    photo: {
      title: "Приложи фото улова",
      body: (
        <div className="space-y-2">
          <MobileField label="Фото рыбы и измерения (макс. 12 МБ)">
            <input
              required={!photo}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              className="field"
            />
          </MobileField>
          {photo && (
            <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
              Выбрано фото: {photo.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Фотография отправится в закрытое хранилище.
          </p>
        </div>
      ),
    },
    review: {
      title: "Проверь заявку BIG FISH",
      body: (
        <>
          <div className="z-single-field-review-edits">
            {(
              [
                [
                  "league",
                  "Дисциплина",
                  league === "street" ? "STREET FISHING" : "ULTRALIGHT / MICROJIG",
                ],
                [
                  "species",
                  "Вид рыбы",
                  { pike: "Щука", zander: "Судак", perch: "Окунь", asp: "Жерех", chub: "Голавль" }[
                    species
                  ] ?? species,
                ],
                ["weight", "Вес", weight + " г"],
                ["length", "Длина", length + " мм"],
                ["time", "Дата и время", capturedAt.replace("T", " ")],
                ["spot", "Спот", eligible.find((spot) => spot.id === spotId)?.name ?? "Не выбран"],
                ["photo", "Фото", photo?.name ?? "Не выбрано"],
              ] as const
            ).map(([target, label, value]) => (
              <button
                key={target}
                type="button"
                className="z-single-field-edit"
                aria-label={"Изменить: " + label}
                disabled={busy}
                onClick={() => {
                  setEditing(true);
                  changeStep(target, true);
                }}
              >
                <span>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Решение по заявке принимает модератор.</p>
        </>
      ),
    },
  }[step];

  return (
    <section id="big-fish-submission" className="z-premium-card mt-8 space-y-5 p-5 sm:p-7">
      <header>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D7FF35]">
          <Crown className="size-4" aria-hidden="true" /> ZAPRUDA / ZARUBA / STAGING
        </p>
        <h2 className="mt-2 text-xl font-black text-white">Одна рыба — заявка BIG FISH</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Первая волна: STREET и ULTRALIGHT. Фотография остаётся в закрытом хранилище. До проверки
          модератором рекорд не меняется.
        </p>
      </header>
      {!uid ? (
        <p className="text-sm text-zinc-300">Для подачи заявки войди в подтверждённый аккаунт.</p>
      ) : (
        <>
          <form
            key={uid}
            onSubmit={(event) => void submit(event)}
            aria-busy={busy}
            className="z-single-field-flow"
          >
            <div className="z-single-field-header">
              <span className="font-bold">BIG FISH</span>
              <SingleFieldProgress step={position + 1} steps={applicationSteps} />
            </div>
            <fieldset disabled={busy} className="min-w-0">
              <SingleFieldStage
                stepKey={step}
                question={questions.title}
                reverse={reverse}
                review={reviewing}
              >
                {questions.body}
              </SingleFieldStage>
            </fieldset>
            <StickyFormActions className="z-single-field-actions">
              <button
                type="submit"
                disabled={busy || (step === "spot" && !eligible.length) || (reviewing && !photo)}
                className="z-glass-advance"
                onClick={(event) => {
                  if (event.detail > 1) event.preventDefault();
                }}
              >
                {busy
                  ? "Отправляем…"
                  : reviewing
                    ? "Отправить на проверку"
                    : editing
                      ? "Готово"
                      : "Далее"}
                {!busy && <ArrowRight size={19} aria-hidden="true" />}
              </button>
              <div className="z-single-field-secondary">
                {(position > 0 || editing) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      changeStep(editing ? "review" : applicationSteps[position - 1]!, true);
                      setEditing(false);
                    }}
                  >
                    {editing ? "К просмотру" : "Назад"}
                  </button>
                )}
              </div>
            </StickyFormActions>
          </form>
          <button
            type="button"
            disabled={busy}
            onClick={() => void refreshOwn()}
            className="btn-ghost min-h-11"
          >
            Мои уловы и уведомления
          </button>
          {!eligible.length && (
            <p className="text-xs text-zinc-400">
              Пока нет юридически проверенных спотов для этой дисциплины.
            </p>
          )}
          {eligible.length > 0 && spotId && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("subscribe", { spot_id: spotId, league })}
              className="text-sm font-semibold text-[#D7FF35] underline"
            >
              Подписаться на смену KING в этой дисциплине
            </button>
          )}
          {!!catches.length && (
            <ul className="space-y-2 text-sm text-zinc-300">
              {catches.map((item) => (
                <li key={item.catch_id} className="rounded-lg border border-white/10 p-3">
                  {item.league} · {item.species} · {item.weight_g} г · {item.status}
                </li>
              ))}
            </ul>
          )}
          {!!notices.length && (
            <div className="space-y-2 text-sm text-zinc-300">
              <h3 className="font-black text-white">Уведомления</h3>
              {notices.map((item) => (
                <p key={item.id}>{item.message}</p>
              ))}
            </div>
          )}
          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("queue")}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-300"
            >
              <ShieldCheck className="size-4" /> Очередь модератора (только уполномоченные)
            </button>
            {queue?.map((item) => (
              <article
                key={item.catch_id}
                className="mt-3 space-y-3 rounded-xl border border-white/10 p-3"
              >
                <p className="text-sm text-white">
                  {item.species} · {item.weight_g} г · {item.length_mm} мм · {item.league}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("evidence", { catch_id: item.catch_id })}
                  className="text-xs font-bold text-[#D7FF35] underline"
                >
                  Открыть фото на 60 секунд
                </button>
                {evidence[item.catch_id] && (
                  <img
                    src={evidence[item.catch_id]}
                    alt="Закрытое фотодоказательство"
                    className="max-h-72 rounded-xl object-contain"
                  />
                )}
                <label className="flex items-start gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={reviewChecked[item.catch_id] ?? false}
                    onChange={(event) =>
                      setReviewChecked((old) => ({
                        ...old,
                        [item.catch_id]: event.target.checked,
                      }))
                    }
                  />
                  Я лично проверил открытое фото, показания измерения, разрешённость ловли,
                  территорию и соответствие заявленной снасти.
                </label>
                {item.league === "ultralight" && (
                  <label className="flex items-start gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={microWelfareChecked[item.catch_id] ?? false}
                      onChange={(event) =>
                        setMicroWelfareChecked((old) => ({
                          ...old,
                          [item.catch_id]: event.target.checked,
                        }))
                      }
                    />
                    Дополнительная проверка MICRO KING: улов случайный, ловля молоди не была целью,
                    охраняемые виды и ограничения не нарушены. Без этого подтверждения возможен
                    только KING OF UL.
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy || !evidence[item.catch_id] || !reviewChecked[item.catch_id]}
                    type="button"
                    onClick={() =>
                      void act("review", {
                        catch_id: item.catch_id,
                        decision: "verified",
                        lawful: true,
                        ul_gear_valid: item.league === "ultralight",
                        micro_welfare_valid: microWelfareChecked[item.catch_id] === true,
                      })
                    }
                    className="rounded-lg bg-[#D7FF35] px-3 py-2 text-xs font-black text-black disabled:opacity-40"
                  >
                    Подтвердить проверенный улов
                  </button>
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() =>
                      void act("review", { catch_id: item.catch_id, decision: "rejected" })
                    }
                    className="rounded-lg border border-red-400/40 px-3 py-2 text-xs text-red-300"
                  >
                    Отклонить
                  </button>
                </div>
                <p className="text-xs text-zinc-400">
                  Подтверждение допускается только после проверки фото, веса, способа ловли,
                  законности и места поимки.
                </p>
              </article>
            ))}
            {queue !== null && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act("reviewed")}
                className="mt-4 text-sm font-semibold text-[#D7FF35] underline"
              >
                Подтверждённые уловы и пересмотр
              </button>
            )}
            {reviewed?.map((item) => (
              <article
                key={item.catch_id}
                className="mt-3 space-y-3 rounded-xl border border-white/10 p-3"
              >
                <p className="text-sm text-white">
                  {item.species} · {item.weight_g} г · {item.length_mm} мм · {item.league}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("evidence", { catch_id: item.catch_id })}
                  className="text-xs font-bold text-[#D7FF35] underline"
                >
                  Открыть фото на 60 секунд
                </button>
                {evidence[item.catch_id] && (
                  <img
                    src={evidence[item.catch_id]}
                    alt="Закрытое фотодоказательство для пересмотра"
                    className="max-h-72 rounded-xl object-contain"
                  />
                )}
                <label className="block text-xs text-zinc-300">
                  Причина отзыва подтверждения
                  <textarea
                    className="mt-1 w-full rounded-xl border border-white/20 bg-[#141923] p-3"
                    minLength={10}
                    maxLength={500}
                    value={revokeReasons[item.catch_id] ?? ""}
                    onChange={(event) =>
                      setRevokeReasons((old) => ({ ...old, [item.catch_id]: event.target.value }))
                    }
                  />
                </label>
                <label className="flex items-start gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={revokeChecked[item.catch_id] ?? false}
                    onChange={(event) =>
                      setRevokeChecked((old) => ({ ...old, [item.catch_id]: event.target.checked }))
                    }
                  />
                  Я проверил основания пересмотра. Подтверждение будет отозвано, титулы пересчитаны,
                  участники уведомлены.
                </label>
                <button
                  type="button"
                  disabled={
                    busy ||
                    item.owner_id === uid ||
                    !evidence[item.catch_id] ||
                    !revokeChecked[item.catch_id] ||
                    (revokeReasons[item.catch_id]?.trim().length ?? 0) < 10
                  }
                  onClick={() =>
                    void act("revoke", {
                      catch_id: item.catch_id,
                      reason: revokeReasons[item.catch_id]?.trim(),
                    })
                  }
                  className="rounded-lg border border-red-400/40 px-3 py-2 text-xs text-red-300 disabled:opacity-40"
                >
                  Отозвать подтверждение и пересчитать KING
                </button>
              </article>
            ))}
          </div>
          {message && (
            <p role="status" className="text-sm text-[#D7FF35]">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
