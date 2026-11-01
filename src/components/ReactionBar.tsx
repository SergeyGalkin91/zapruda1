import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const options = [
  { emoji: "🔥", label: "Огонь", type: "fire" },
  { emoji: "❤️", label: "Нравится", type: "heart" },
  { emoji: "😂", label: "Смешно", type: "laugh" },
  { emoji: "🎣", label: "Рыбалка", type: "fish" },
  { emoji: "👏", label: "Красавчик", type: "clap" },
  { emoji: "🤝", label: "Поддержка", type: "support" },
];

type ReactionRow = { id: string; user_id: string; reaction_type: string };

export function ReactionBar({
  compact = false,
  reportId,
}: {
  compact?: boolean;
  reportId?: string;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(reportId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadReactions = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id ?? null;
      setUserId(currentUserId);

      const { data, error: queryError } = await supabase
        .from("reactions")
        .select("id,user_id,reaction_type")
        .eq("report_id", reportId);
      if (queryError) throw queryError;

      const rows = (data ?? []) as ReactionRow[];
      const nextCounts: Record<string, number> = {};
      for (const option of options) {
        nextCounts[option.type] = rows.filter((row) => row.reaction_type === option.type).length;
      }
      setCounts(nextCounts);
      setSelected(currentUserId
        ? rows.filter((row) => row.user_id === currentUserId).map((row) => row.reaction_type)
        : []);
      setError("");
    } catch (cause) {
      setError("Не удалось загрузить реакции: " + (cause instanceof Error ? cause.message : "ошибка сети"));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!reportId) return;
    void loadReactions();
    const channel = supabase
      .channel("report-reactions-" + reportId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "reactions",
        filter: "report_id=eq." + reportId,
      }, () => void loadReactions())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [reportId, loadReactions]);

  const toggle = async (emoji: string, type: string) => {
    if (busy) return;
    if (!reportId) {
      const active = selected.includes(emoji);
      setSelected((current) => active ? current.filter((x) => x !== emoji) : [...current, emoji]);
      setCounts((current) => ({ ...current, [emoji]: Math.max(0, (current[emoji] ?? 0) + (active ? -1 : 1)) }));
      return;
    }
    if (!userId) {
      setError("Войди в аккаунт, чтобы ставить реакции.");
      return;
    }

    setBusy(type);
    setError("");
    try {
      const { data, error: findError } = await supabase
        .from("reactions")
        .select("id")
        .eq("report_id", reportId)
        .eq("user_id", userId)
        .eq("reaction_type", type);

      if (findError) throw findError;
      const existing = data ?? [];
      if (existing.length) {
        const { error: deleteError } = await supabase
          .from("reactions")
          .delete()
          .in("id", existing.map((row) => row.id));
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from("reactions")
          .insert({ report_id: reportId, user_id: userId, reaction_type: type });
        if (insertError) throw insertError;
      }
      await loadReactions();
    } catch (e) {
      setError("Не удалось сохранить реакцию: " + (e instanceof Error ? e.message : "неизвестная ошибка"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2" aria-label="Реакции">
        {options.map(({ emoji, label, type }) => {
          const isSelected = reportId ? selected.includes(type) : selected.includes(emoji);
          const countKey = reportId ? type : emoji;
          return (
            <button
              key={emoji}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isSelected}
              disabled={Boolean(busy) || loading}
              onClick={() => void toggle(emoji, type)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition hover:-translate-y-0.5 hover:bg-secondary disabled:opacity-60 ${isSelected ? "border-primary bg-primary/10" : "border-border"} ${compact ? "px-2 py-1" : ""}`}
            >
              <span>{emoji}</span><span className="text-xs tabular-nums">{counts[countKey] ?? 0}</span>
            </button>
          );
        })}
      </div>
      {error && <div className="mt-2 flex flex-wrap items-center gap-2" role="status">
        <span className="text-xs text-destructive">{error}</span>
        {reportId && <button type="button" className="min-h-10 rounded-lg border border-[#D7FF35]/40 px-3 text-xs font-semibold text-[#D7FF35] disabled:opacity-60" disabled={loading || Boolean(busy)} onClick={() => void loadReactions()}>
          {loading ? "Загрузка…" : "Повторить"}
        </button>}
      </div>}
      {reportId && !userId && !loading && !error && (
        <p className="mt-2 text-xs text-muted-foreground">Войди в аккаунт, чтобы ставить реакции.</p>
      )}
    </div>
  );
}
