import { useRef, useState } from "react";
import { onSpotAction } from "@/lib/on-spot-api";

export function OnSpotMessageActions({
  actor,
  place,
  id,
  peer,
  onBlock,
}: {
  actor: string;
  place: string;
  id: string;
  peer: string;
  onBlock: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [reason, setReason] = useState("abuse");
  const running = useRef(false);
  async function run(action: "invite" | "block" | "report") {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setStatus("");
    setError(false);
    try {
      await onSpotAction(actor, action, null, {
        place,
        id,
        peer,
        ...(action === "report" ? { kind: "message", reason } : {}),
      });
      if (action === "block") onBlock();
      else setStatus(action === "invite" ? "Приглашение отправлено." : "Жалоба отправлена.");
    } catch (cause) {
      setError(true);
      setStatus(cause instanceof Error ? cause.message : "Действие недоступно.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="min-h-11 cursor-pointer py-3">Действия в зоне</summary>
      <div className="grid gap-2">
        <button
          type="button"
          className="btn-ghost min-h-11"
          disabled={busy}
          onClick={() => void run("invite")}
        >
          Порыбачим вместе?
        </button>
        <label>
          Причина жалобы
          <select
            className="field min-h-11 w-full"
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="abuse">Оскорбление</option>
            <option value="spam">Спам</option>
            <option value="privacy">Нарушение приватности</option>
            <option value="unsafe">Опасное поведение</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-ghost min-h-11"
          disabled={busy}
          onClick={() => void run("report")}
        >
          Пожаловаться
        </button>
        <button
          type="button"
          className="btn-ghost min-h-11"
          disabled={busy}
          onClick={() => void run("block")}
        >
          Заблокировать
        </button>
        <p>Блокировка скроет сообщения в локальных зонах и закроет личную переписку.</p>
        {status && <p role={error ? "alert" : "status"}>{status}</p>}
      </div>
    </details>
  );
}
