import { useState } from "react";

const options = [
  { emoji: "🔥", label: "Огонь" },
  { emoji: "❤️", label: "Нравится" },
  { emoji: "😂", label: "Смешно" },
  { emoji: "🎣", label: "Рыбалка" },
  { emoji: "👏", label: "Красавчик" },
  { emoji: "🤝", label: "Поддержка" },
];

export function ReactionBar({ compact = false }: { compact?: boolean }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(emoji: string) {
    const active = selected.includes(emoji);
    setSelected((current) => active ? current.filter((x) => x !== emoji) : [...current, emoji]);
    setCounts((current) => ({ ...current, [emoji]: Math.max(0, (current[emoji] ?? 0) + (active ? -1 : 1)) }));
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Реакции">
      {options.map(({ emoji, label }) => (
        <button
          key={emoji}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={selected.includes(emoji)}
          onClick={() => toggle(emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition hover:-translate-y-0.5 hover:bg-secondary ${selected.includes(emoji) ? "border-primary bg-primary/10" : "border-border"} ${compact ? "px-2 py-1" : ""}`}
        >
          <span>{emoji}</span><span className="text-xs tabular-nums">{counts[emoji] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
