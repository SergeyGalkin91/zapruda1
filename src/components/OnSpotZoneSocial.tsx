import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  onSpotAction,
  onSpotPhoto,
  onSpotSnapshot,
  type OnSpotAction,
  type OnSpotPayload,
  type OnSpotSnapshot,
} from "@/lib/on-spot-api";

const inviteStatus = {
  pending: "Ожидает ответа",
  accepted: "Принято",
  declined: "Отклонено",
  cancelled: "Отменено",
  expired: "Срок истёк",
};
const photoStatus = {
  pending: "Ждёт согласия",
  approved: "Согласие дано",
  declined: "Согласие не дано",
  revoked: "Согласие отозвано",
};
const field = "field min-h-11 min-w-0 w-full";
const button = "btn-ghost min-h-11 whitespace-normal";
type Run = (action: OnSpotAction, payload?: OnSpotPayload) => Promise<boolean>;

function PrivatePhoto({ actor, id }: { actor: string; id: string }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let url = "";
    void onSpotPhoto(actor, id)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [actor, id]);
  if (failed)
    return (
      <p role="alert" className="text-sm text-red-300">
        Фото недоступно. Закрой и открой его ещё раз.
      </p>
    );
  return src ? (
    <img
      alt="Приватное совместное фото"
      className="max-h-72 w-full rounded-xl object-contain"
      src={src}
    />
  ) : (
    <p role="status" className="text-sm">
      Загружаем фото…
    </p>
  );
}

function TripLinks({
  invite,
  data,
  run,
  busy,
}: {
  invite: OnSpotSnapshot["invites"][number];
  data: OnSpotSnapshot;
  run: Run;
  busy: boolean;
}) {
  const [meetup, setMeetup] = useState(invite.meetup_id ?? "");
  const [report, setReport] = useState(invite.report_id ?? "");
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (meetup || report)
          void run("link_trip", { id: invite.id, meetup: meetup || null, report: report || null });
      }}
    >
      <label className="text-sm">
        Моя СХОДКА
        <select
          className={field}
          value={meetup}
          disabled={busy}
          onChange={(event) => setMeetup(event.target.value)}
        >
          <option value="">Не привязывать</option>
          {data.own_meetups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Мой приватный отчёт
        <select
          className={field}
          value={report}
          disabled={busy}
          onChange={(event) => setReport(event.target.value)}
        >
          <option value="">Не привязывать</option>
          {data.own_reports.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        Отчёт останется приватным. Участие в СХОДКЕ выбирается отдельно.
      </p>
      <button type="submit" className={button} disabled={busy || (!meetup && !report)}>
        Связать выезд
      </button>
    </form>
  );
}

function PhotoConsent({
  actor,
  data,
  run,
  busy,
}: {
  actor: string;
  data: OnSpotSnapshot;
  run: Run;
  busy: boolean;
}) {
  const [photo, setPhoto] = useState("");
  const [peers, setPeers] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [open, setOpen] = useState("");
  const partners = [
    ...new Map(
      data.invites.filter((i) => i.status === "accepted").map((i) => [i.peer_id, i.peer_name]),
    ).entries(),
  ];
  return (
    <details className="rounded-xl border border-border p-3">
      <summary className="cursor-pointer py-2 font-bold">Совместные фото</summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Выбери фото из своего приватного отчёта и всех людей на нём. Общий просмотр откроется
        указанным участникам только после их согласия. Любой из них может его отозвать.
      </p>
      {!data.own_photos.length && (
        <p className="mt-3 text-sm">
          Добавь фото в{" "}
          <Link to="/reports/new" className="underline">
            приватный отчёт
          </Link>
          .
        </p>
      )}
      {!!data.own_photos.length && !partners.length && (
        <p className="mt-3 text-sm">Сначала договорись о совместной рыбалке через приглашение.</p>
      )}
      {!!data.own_photos.length && !!partners.length && (
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!photo || !peers.length || !agreed) return;
            void run("photo_request", { id: photo, peers, consent: true }).then((ok) => {
              if (ok) {
                setPhoto("");
                setPeers([]);
                setAgreed(false);
              }
            });
          }}
        >
          <label className="text-sm">
            Фото из приватного отчёта
            <select
              className={field}
              value={photo}
              disabled={busy}
              onChange={(e) => setPhoto(e.target.value)}
            >
              <option value="">Выбрать фото</option>
              {data.own_photos.map((item, index) => (
                <option key={item.id} value={item.id}>
                  {item.title} · фото {index + 1}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-1" disabled={busy}>
            <legend className="text-sm">Кто на фото</legend>
            {partners.map(([id, name]) => (
              <label key={id} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={peers.includes(id)}
                  disabled={peers.length >= 5 && !peers.includes(id)}
                  onChange={(e) =>
                    setPeers((current) =>
                      e.target.checked ? [...current, id] : current.filter((p) => p !== id),
                    )
                  }
                />
                <span className="break-all">{name}</span>
              </label>
            ))}
          </fieldset>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              disabled={busy}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            Разрешаю приватный просмотр указанным участникам после их согласия
          </label>
          <button
            type="submit"
            className="btn-primary min-h-11"
            disabled={busy || !photo || !peers.length || !agreed}
          >
            Запросить согласие
          </button>
        </form>
      )}
      {!data.photos.length && (
        <p className="mt-3 text-sm text-muted-foreground">Запросов на фото пока нет.</p>
      )}
      <ul className="mt-3 grid gap-3">
        {data.photos.map((item) => (
          <li key={item.photo_id} className="min-w-0 rounded-xl border border-border p-3">
            <p className="break-all font-semibold">
              {item.owned ? "Моё совместное фото" : item.owner_name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{photoStatus[item.status]}</p>
            <div className="my-2 flex flex-wrap gap-2">
              {item.can_view && (
                <button
                  type="button"
                  className={button}
                  onClick={() => setOpen(open === item.photo_id ? "" : item.photo_id)}
                >
                  {open === item.photo_id ? "Скрыть фото" : "Посмотреть фото"}
                </button>
              )}
              {!item.owned && item.status === "pending" && !item.can_view && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void run("photo_preview", { id: item.photo_id }).then((ok) => {
                      if (ok) setOpen(item.photo_id);
                    })
                  }
                >
                  Посмотреть для согласования
                </button>
              )}
              {!item.owned && item.status === "pending" && (
                <>
                  {item.can_view && open === item.photo_id && (
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void run("photo_reply", { id: item.photo_id, decision: "approved" })
                      }
                    >
                      Согласиться на общий просмотр
                    </button>
                  )}
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void run("photo_reply", { id: item.photo_id, decision: "declined" })
                    }
                  >
                    Отказать
                  </button>
                </>
              )}
              {item.status === "approved" && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void run("photo_revoke", { id: item.photo_id })}
                >
                  Отозвать согласие
                </button>
              )}
              {!item.owned && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void run("report", { kind: "photo", id: item.photo_id, reason: "privacy" })
                  }
                >
                  Жалоба на приватность
                </button>
              )}
            </div>
            {open === item.photo_id && item.can_view && (
              <PrivatePhoto key={item.photo_id} actor={actor} id={item.photo_id} />
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Mounted only for an explicitly joined zone and remounted on actor/zone changes. */
export function OnSpotZoneSocial({ actor, zone }: { actor: string; zone: string }) {
  const [data, setData] = useState<OnSpotSnapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [discover, setDiscover] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const mutating = useRef(false);

  const load = useCallback(async () => {
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    const timeout = window.setTimeout(() => abort.abort("deadline"), 8000);
    try {
      const result = await onSpotSnapshot(actor, zone, abort.signal);
      if (!abort.signal.aborted && mounted.current) {
        setData(result);
        setError("");
      }
    } catch {
      if (
        mounted.current &&
        request.current === abort &&
        (!abort.signal.aborted || abort.signal.reason === "deadline")
      ) {
        setData(null);
        setError("Не удалось проверить доступ к зоне. Обнови список.");
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }, [actor, zone]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => {
      if (!mutating.current && document.visibilityState === "visible") void load();
    };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false;
      request.current?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  async function run(action: OnSpotAction, payload: OnSpotPayload = {}) {
    if (mutating.current) return false;
    mutating.current = true;
    request.current?.abort();
    setBusy(true);
    setError("");
    setNotice("");
    if (action === "presence_off")
      setData((previous) => (previous ? { ...previous, presence: null, people: [] } : null));
    try {
      await onSpotAction(actor, action, zone, payload);
      if (!mounted.current) return false;
      await load();
      if (mounted.current)
        setNotice(
          action === "invite"
            ? "Приглашение отправлено."
            : action === "report"
              ? "Жалоба отправлена."
              : "Сохранено.",
        );
      return true;
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : "Не удалось сохранить изменение.");
      return false;
    } finally {
      mutating.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  if (!data)
    return (
      <div className="mt-4 grid gap-2">
        {error ? (
          <>
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
            <button className={button} type="button" onClick={() => void load()}>
              Повторить
            </button>
          </>
        ) : (
          <p role="status" className="text-sm">
            Загружаем настройки зоны…
          </p>
        )}
      </div>
    );
  return (
    <div className="mt-4 grid min-w-0 gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <details className="rounded-xl border border-border p-3" open>
        <summary className="cursor-pointer py-2 font-bold">Присутствие и приватность</summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Отметка действует только в выбранной зоне. Координаты и расстояние не передаются.
        </p>
        {data.presence ? (
          <div className="my-3 grid gap-2">
            <p className="font-semibold">
              Я на рыбалке · до{" "}
              {new Date(data.presence.expires_at).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-sm">
              {data.presence.discoverable
                ? "Ты разрешил показывать профиль рыбакам этой зоны."
                : "Твой профиль скрыт из списка рядом."}
            </p>
            <button
              className={button}
              disabled={busy}
              type="button"
              onClick={() => void run("presence_off")}
            >
              Выключить статус
            </button>
          </div>
        ) : (
          <form
            className="my-3 grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run("presence_on", { minutes, discoverable: discover });
            }}
          >
            <label className="text-sm">
              На сколько включить
              <select
                className={field}
                value={minutes}
                disabled={busy}
                onChange={(e) => setMinutes(Number(e.target.value))}
              >
                <option value={30}>30 минут</option>
                <option value={60}>1 час</option>
                <option value={120}>2 часа</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={discover}
                disabled={busy}
                onChange={(e) => setDiscover(e.target.checked)}
              />
              Показывать мой профиль в «Рыбаки рядом»
            </label>
            <button type="submit" className="btn-primary min-h-11" disabled={busy}>
              Я на рыбалке
            </button>
          </form>
        )}
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.allow_invites}
            disabled={busy}
            onChange={(e) => void run("preferences", { invites: e.target.checked })}
          />
          Принимать приглашения на рыбалку
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.announcements}
            disabled={busy}
            onChange={(e) => void run("preferences", { announcements: e.target.checked })}
          />
          Получать объявления этой зоны
        </label>
        {!!data.blocked.length && (
          <ul aria-label="Заблокированные" className="mt-3 space-y-2">
            {data.blocked.map((peer) => (
              <li key={peer.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-all">{peer.name}</span>
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() => void run("unblock", { peer: peer.id })}
                >
                  Разблокировать
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer py-2 font-bold">Рыбаки рядом</summary>
        {!data.people.length ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Список пуст или скрыт для приватности. Для знакомства можно написать в чат зоны.
          </p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {data.people.map((peer) => (
              <li key={peer.id} className="grid gap-2 rounded-lg border border-border p-2">
                <span className="break-all">{peer.name}</span>
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() => void run("invite", { peer: peer.id })}
                >
                  Порыбачим вместе?
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer py-2 font-bold">Приглашения и выезды</summary>
        {!data.invites.length && (
          <p className="mt-2 text-sm text-muted-foreground">Приглашений пока нет.</p>
        )}
        <ul className="mt-2 grid gap-3">
          {data.invites.map((invite) => (
            <li key={invite.id} className="min-w-0 space-y-2 rounded-xl border border-border p-3">
              <p className="break-all font-semibold">{invite.peer_name}</p>
              <p className="text-sm text-muted-foreground">
                {invite.outgoing ? "Исходящее" : "Входящее"} · {inviteStatus[invite.status]}
              </p>
              <div className="flex flex-wrap gap-2">
                {!invite.outgoing && invite.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void run("invite_reply", { id: invite.id, decision: "accepted" })
                      }
                    >
                      Принять и открыть ЛС
                    </button>
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void run("invite_reply", { id: invite.id, decision: "declined" })
                      }
                    >
                      Отклонить
                    </button>
                  </>
                )}
                {invite.outgoing &&
                  (invite.status === "pending" || invite.status === "accepted") && (
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() => void run("invite_cancel", { id: invite.id })}
                    >
                      Отменить встречу
                    </button>
                  )}
                {invite.thread_id && (
                  <Link className={button} to="/messages" search={{ mark: "", to: invite.peer_id }}>
                    Перейти в ЛС
                  </Link>
                )}
                {invite.meetup_id && (
                  <Link className={button} to="/communities" hash={"meetup-" + invite.meetup_id}>
                    Открыть СХОДКУ
                  </Link>
                )}
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => void run("block", { peer: invite.peer_id })}
                >
                  Заблокировать
                </button>
                {!invite.outgoing && (
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void run("report", { kind: "invite", id: invite.id, reason: "spam" })
                    }
                  >
                    Пожаловаться на спам
                  </button>
                )}
              </div>
              {invite.status === "accepted" && invite.outgoing && (
                <TripLinks
                  key={invite.id + ":" + invite.meetup_id + ":" + invite.report_id}
                  invite={invite}
                  data={data}
                  run={run}
                  busy={busy}
                />
              )}
            </li>
          ))}
        </ul>
      </details>

      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer py-2 font-bold">Объявления зоны</summary>
        <form
          className="my-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (announcement.trim())
              void run("announce", { body: announcement.trim() }).then((ok) => {
                if (ok) setAnnouncement("");
              });
          }}
        >
          <label className="text-sm">
            Приглашение для подписавшихся
            <input
              className={field}
              maxLength={280}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Доставка только внутри приложения и только тем, кто её включил.
          </p>
          <button
            className="btn-primary min-h-11"
            type="submit"
            disabled={busy || !announcement.trim()}
          >
            Позвать компанию
          </button>
        </form>
        {!data.inbox.length && (
          <p className="text-sm text-muted-foreground">Входящих объявлений нет.</p>
        )}
        <ul className="grid gap-3">
          {data.inbox.map((item) => (
            <li key={item.id} className="min-w-0 rounded-lg border border-border p-3">
              <p className="break-all font-semibold">{item.sender_name}</p>
              <p className="my-2 break-words text-sm">{item.body}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() => void run("dismiss", { id: item.id })}
                >
                  Скрыть
                </button>
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run("report", { kind: "announcement", id: item.id, reason: "spam" })
                  }
                >
                  Пожаловаться на спам
                </button>
              </div>
            </li>
          ))}
        </ul>
      </details>
      <PhotoConsent actor={actor} data={data} run={run} busy={busy} />
    </div>
  );
}
