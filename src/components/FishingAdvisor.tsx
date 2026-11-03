import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Fish,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFishingPlan,
  FISHING_TARGETS,
  FISHING_TIMES,
  prepareAdviceInput,
  type FishingPlan,
} from "@/lib/fishing-plan";
import { requestOptionalGrok } from "@/lib/optional-grok";

type Log = {
  id: string;
  advice_day: string;
  prompt_summary: string;
  answer: string;
  status: "pending" | "ready" | "failed";
  created_at: string;
  attempts: number;
};

export function FishingAdvisor() {
  const [uid, setUid] = useState("");
  const [verified, setVerified] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [location, setLocation] = useState("");
  const [target, setTarget] = useState<string>(FISHING_TARGETS[0]);
  const [time, setTime] = useState<string>(FISHING_TIMES[0]);
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<FishingPlan | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState<{ answer: string; summary: string } | null>(null);
  const identity = useRef<string | null>(null);
  const mounted = useRef(true);
  const historyVersion = useRef(0);
  const requestVersion = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const refreshHistory = useCallback(async (userId: string) => {
    const version = ++historyVersion.current;
    const current = () =>
      mounted.current && identity.current === userId && historyVersion.current === version;
    if (!current()) return;
    setHistoryBusy(true);
    try {
      const result = await supabase
        .from("ai_daily_advices")
        .select("id,advice_day,prompt_summary,answer,status,created_at,attempts")
        .eq("user_id", userId)
        .order("advice_day", { ascending: false })
        .limit(14);
      if (!current()) return;
      if (result.error)
        setHistoryError("Журнал Grok временно недоступен. План по правилам работает.");
      else {
        setLogs((result.data ?? []) as Log[]);
        setHistoryError("");
      }
    } catch {
      if (current()) setHistoryError("Журнал Grok временно недоступен. План по правилам работает.");
    } finally {
      if (current()) setHistoryBusy(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let alive = true;
    let authVersion = 0;
    const applyUser = (user: User | null) => {
      if (!alive) return;
      const next = user && !user.is_anonymous ? user.id : "";
      if (identity.current !== null && identity.current !== next) {
        requestVersion.current++;
        historyVersion.current++;
        activeRequest.current?.abort();
        setBusy(false);
        setHistoryBusy(false);
        setLogs([]);
        setReply(null);
        setPlan(null);
        setLocation("");
        setTarget(FISHING_TARGETS[0]);
        setTime(FISHING_TIMES[0]);
        setNotes("");
        setNotice("");
        setError("");
        setHistoryError("");
      }
      identity.current = next;
      setUid(next);
      setVerified(Boolean(next && user?.email_confirmed_at));
      setAuthReady(true);
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
    return () => {
      alive = false;
      mounted.current = false;
      activeRequest.current?.abort();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    void refreshHistory(uid);
    void Promise.resolve()
      .then(() =>
        supabase
          .from("angler_preferences")
          .select("preferred_water,main_technique")
          .eq("user_id", uid)
          .maybeSingle(),
      )
      .then(({ data }) => {
        if (alive && identity.current === uid && data?.preferred_water)
          setLocation((value) => value || data.preferred_water || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uid, refreshHistory]);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const current = logs.find((log) => log.advice_day === today);
  const quotaUsed = current?.status === "ready" || Boolean(reply);
  const failureLimit = current?.status === "failed" && current.attempts >= 3;
  const latestAnswer = reply?.answer || (current?.status === "ready" ? current.answer : "");
  const latestSummary =
    reply?.summary || (current?.status === "ready" ? current.prompt_summary : "");

  const makePlan = () => {
    try {
      const next = buildFishingPlan({ location, target, time, notes });
      setPlan(next);
      setError("");
      return next;
    } catch {
      setError("Укажи водоём или примерное место — минимум два символа.");
      return null;
    }
  };
  function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (makePlan()) setNotice("План по правилам готов. Он не расходует дневной совет Grok.");
  }
  async function askGrok() {
    if (busy || !uid || !verified || quotaUsed || failureLimit) return;
    const next = makePlan();
    if (!next) return;
    const userId = uid;
    const version = ++requestVersion.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setNotice("");
    const isCurrent = () =>
      mounted.current && identity.current === userId && requestVersion.current === version;
    try {
      const input = prepareAdviceInput(next.input);
      const result = await requestOptionalGrok(
        input,
        (body, signal) => supabase.functions.invoke("zapruda-daily-advice", { body, signal }),
        { signal: controller.signal },
      );
      if (!isCurrent()) return;
      if (result.ok) {
        setReply({
          answer: result.answer,
          summary: result.alreadyUsed ? "" : `${input.location} · ${input.target} · ${input.time}`,
        });
        setNotice(
          result.alreadyUsed
            ? "Показан сохранённый совет Grok за сегодня."
            : "Совет Grok получен и сохранён в журнале.",
        );
      } else if (result.reason !== "cancelled") {
        setNotice(
          result.reason === "signin"
            ? "Для Grok нужно снова войти в аккаунт. План по правилам готов."
            : result.reason === "timeout"
              ? "Grok отвечает дольше обычного. План по правилам готов; результат Grok можно проверить в журнале."
              : "Grok временно недоступен. План по правилам готов — им можно пользоваться.",
        );
      }
    } catch {
      if (isCurrent())
        setNotice("Grok временно недоступен. План по правилам готов — им можно пользоваться.");
    } finally {
      if (isCurrent()) {
        setBusy(false);
        activeRequest.current = null;
        void refreshHistory(userId);
      }
    }
  }

  return (
    <>
      <header className="rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#243019] to-[#10150E] p-5 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#D7FF35]">
          <BrainCircuit className="size-5" /> ZAPRUDA / AI-РЫБОЛОВ
        </p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          План рыбалки и совет Grok
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Опиши водоём, цель и время. План по правилам готовится сразу. Grok доступен как
          дополнительный ИИ-совет — один успешно полученный ответ за день по Москве.
        </p>
      </header>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-xl border border-[#D7FF35]/20 p-3 text-sm text-[#D7FF35]"
            >
              {notice}
            </p>
          )}
          {plan && (
            <section
              aria-labelledby="rules-plan-title"
              className="rounded-2xl border border-[#D7FF35]/35 bg-[#151D14] p-5"
            >
              <h2
                id="rules-plan-title"
                className="flex items-center gap-2 font-black text-[#D7FF35]"
              >
                <Fish className="size-5" /> План по правилам
              </h2>
              <p className="mt-2 text-xs text-zinc-400">
                Источник: правила ZAPRUDA · без генерации ИИ
              </p>
              <p className="mt-3 break-words text-sm text-zinc-100">
                {plan.input.location} · {plan.input.target} · {plan.input.time}
              </p>
              {plan.sections.map((section) => (
                <div key={section.title} className="mt-4">
                  <h3 className="text-sm font-bold text-white">{section.title}</h3>
                  <p className="mt-1 text-sm leading-7 text-zinc-300">{section.text}</p>
                </div>
              ))}
              {plan.input.notes && (
                <p className="mt-4 break-words text-xs text-zinc-400">
                  Твои заметки: {plan.input.notes}
                </p>
              )}
            </section>
          )}
          {latestAnswer && (
            <section
              aria-labelledby="grok-answer-title"
              className="rounded-2xl border border-[#D7FF35]/35 bg-[#151D14] p-5"
            >
              <h2
                id="grok-answer-title"
                className="flex items-center gap-2 font-black text-[#D7FF35]"
              >
                <CheckCircle2 className="size-5" /> Совет Grok за сегодня
              </h2>
              <p className="mt-2 text-xs text-zinc-400">Источник: Grok · ИИ-генерация</p>
              {latestSummary && (
                <p className="mt-2 break-words text-xs text-zinc-400">{latestSummary}</p>
              )}
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-100">
                {latestAnswer}
              </p>
            </section>
          )}
          <form
            onSubmit={submitPlan}
            className="space-y-4 rounded-2xl border border-white/10 bg-[#151A14] p-5"
          >
            <h2 className="font-black">Подготовить план рыбалки</h2>
            <label className="block text-xs font-semibold text-zinc-300">
              Водоём / примерное место
              <input
                required
                minLength={2}
                maxLength={140}
                className="field mt-1 w-full"
                placeholder="Например, Ока у Мызинского моста"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Рыба
                <select
                  className="field mt-1 w-full"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                >
                  {FISHING_TARGETS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-zinc-300">
                Когда собираешься ловить
                <select
                  className="field mt-1 w-full"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                >
                  {FISHING_TIMES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-zinc-300">
              Что известно о месте (необязательно)
              <textarea
                className="field mt-1 min-h-20 w-full"
                maxLength={400}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Например, вода сильно упала, мелко, жерех бьёт на течении"
              />
            </label>
            <p className="flex items-start gap-2 text-xs leading-5 text-zinc-400">
              <ShieldCheck className="size-4 shrink-0 text-[#D7FF35]" />
              План по правилам использует параметры этой формы. Актуальная погода и рельеф здесь не
              проверяются. Результат уточняй по наблюдениям на воде.
            </p>
            <button
              className="btn-primary inline-flex min-h-12 items-center gap-2"
              type="submit"
              disabled={location.trim().length < 2}
            >
              <Fish className="size-5" /> Составить план
            </button>
            <div className="border-t border-white/10 pt-4">
              <p className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
                <CalendarDays className="size-4 text-[#D7FF35]" />
                Grok · {today} ·{" "}
                {quotaUsed ? "совет за день уже получен" : "один успешный ИИ-совет в день"}
              </p>
              {uid && verified ? (
                <button
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#D7FF35]/30 px-4 py-3 text-sm font-bold text-[#D7FF35] disabled:opacity-50"
                  type="button"
                  disabled={busy || quotaUsed || failureLimit || location.trim().length < 2}
                  onClick={() => void askGrok()}
                >
                  <Sparkles className="size-5" />
                  {busy
                    ? "Grok готовит дополнение…"
                    : quotaUsed
                      ? "Совет Grok на сегодня получен"
                      : failureLimit
                        ? "Запросы Grok на сегодня приостановлены"
                        : "Добавить совет Grok"}
                </button>
              ) : (
                <p className="text-xs text-zinc-400">
                  {!authReady ? (
                    "Проверяем доступ к Grok. План по правилам уже доступен."
                  ) : uid ? (
                    "Для Grok подтверди почту. План по правилам уже доступен."
                  ) : (
                    <>
                      Для дополнения от Grok{" "}
                      <Link
                        search={{ mode: "in" }}
                        to="/auth"
                        className="font-bold text-[#D7FF35] underline"
                      >
                        войди в аккаунт
                      </Link>
                      . План по правилам уже доступен.
                    </>
                  )}
                </p>
              )}
            </div>
          </form>
        </div>
        <aside className="space-y-3 rounded-2xl border border-white/10 bg-[#151915] p-5">
          <h2 className="flex items-center gap-2 font-black">
            <Clock3 className="size-5 text-[#D7FF35]" /> Журнал ИИ-запросов
          </h2>
          <p className="text-xs text-zinc-400">
            В журнал попадают запросы к Grok. План по правилам остаётся в этой вкладке и не
            расходует ИИ-лимит.
          </p>
          {uid && (
            <button
              type="button"
              className="text-xs font-bold text-[#D7FF35] underline disabled:opacity-50"
              disabled={historyBusy}
              onClick={() => void refreshHistory(uid)}
            >
              {historyBusy ? "Обновляем журнал…" : "Обновить журнал"}
            </button>
          )}
          {historyError && (
            <p role="status" className="text-xs text-zinc-400">
              {historyError}
            </p>
          )}
          {!logs.length && (
            <p className="text-sm text-zinc-500">
              {uid ? "ИИ-запросов пока нет." : "После входа здесь появится твой журнал Grok."}
            </p>
          )}
          {logs.map((log) => (
            <details key={log.id} className="rounded-xl border border-white/10 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-zinc-100">
                {log.advice_day} ·{" "}
                {log.status === "ready"
                  ? "Совет Grok выдан"
                  : log.status === "pending"
                    ? "В процессе"
                    : "Ответ Grok не получен"}
              </summary>
              <p className="mt-2 break-words text-xs text-zinc-400">
                {log.prompt_summary || "Запрос без описания"}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">Попыток: {log.attempts}</p>
              {log.status === "ready" && (
                <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-300">
                  {log.answer}
                </p>
              )}
            </details>
          ))}
          <div className="border-t border-white/10 pt-3 text-xs text-zinc-400">
            Нужен разбор сохранённой точки и комплекта?
            <Link
              to="/analytics"
              search={{ mark: "" }}
              className="mt-2 block font-bold text-[#D7FF35] underline"
            >
              Аналитика Beta для VIP →
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
