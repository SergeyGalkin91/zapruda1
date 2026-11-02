import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const OPTIONS = [
  { emoji: "🔥", type: "fire", label: "Огонь" },
  { emoji: "❤️", type: "heart", label: "Нравится" },
  { emoji: "😂", type: "laugh", label: "Смех" },
  { emoji: "🎣", type: "fish", label: "Рыбалка" },
  { emoji: "👏", type: "clap", label: "Красавчик" },
  { emoji: "🤝", type: "support", label: "Поддержка" },
] as const;

type Row = { id: string; user_id: string; emoji: string };

/**
 * Reactions under a private message.
 * Requires public.social_message_reactions with emoji column (STAGING migration stage12_private_dm_consented).
 * If the table is missing on the project, the bar stays hidden after one failed load.
 */
export function DmMessageReactions({
  messageId,
  currentUserId,
}: {
  messageId: string;
  currentUserId: string;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    if (!messageId || !available) return;
    const { data, error } = await db
      .from("social_message_reactions")
      .select("id,user_id,emoji")
      .eq("message_id", messageId);
    if (error) {
      if (/relation|does not exist|schema cache|permission/i.test(error.message)) {
        setAvailable(false);
      }
      return;
    }
    const rows = (data ?? []) as Row[];
    const next: Record<string, number> = {};
    for (const opt of OPTIONS) {
      next[opt.type] = rows.filter((r) => r.emoji === opt.emoji).length;
    }
    setCounts(next);
    setMine(
      rows.filter((r) => r.user_id === currentUserId).map((r) => OPTIONS.find(o => o.emoji === r.emoji)?.type).filter((v): v is string => Boolean(v)),
    );
  }, [messageId, currentUserId, available]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!messageId || !available) return;
    const channel = supabase
      .channel("dm-reactions-" + messageId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "social_message_reactions",
          filter: "message_id=eq." + messageId,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [messageId, available, load]);

  async function toggle(type: string) {
    if (busy || !available || !currentUserId) return;
    setBusy(true);
    try {
      if (mine.includes(type)) {
        await db
          .from("social_message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", currentUserId)
          .eq("emoji", OPTIONS.find(o => o.type === type)?.emoji ?? type);
      } else {
        await db.from("social_message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji: OPTIONS.find(o => o.type === type)?.emoji ?? type,
        });
      }
      await load();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (!available) return null;

  const active = OPTIONS.filter((o) => (counts[o.type] ?? 0) > 0);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {active.map((o) => (
        <button
          key={o.type}
          type="button"
          disabled={busy}
          aria-label={o.label}
          onClick={() => void toggle(o.type)}
          className={
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition " +
            (mine.includes(o.type)
              ? "border-[#D7FF35]/50 bg-[#D7FF35]/15 text-[#D7FF35]"
              : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/25")
          }
        >
          <span aria-hidden="true">{o.emoji}</span>
          <span>{counts[o.type]}</span>
        </button>
      ))}
      <button
        type="button"
        aria-expanded={open}
        aria-label="Добавить реакцию"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-400 hover:border-[#D7FF35]/40 hover:text-[#D7FF35]"
      >
        +
      </button>
      {open && (
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#121612] p-1">
          {OPTIONS.map((o) => (
            <button
              key={o.type}
              type="button"
              title={o.label}
              aria-label={o.label}
              disabled={busy}
              onClick={() => void toggle(o.type)}
              className="size-8 rounded-lg text-base hover:bg-white/10"
            >
              {o.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
