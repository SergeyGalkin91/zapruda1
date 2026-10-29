import { createFileRoute } from "@tanstack/react-router";
import { Shell, NotConnected } from "@/components/Shell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Профиль рыболова — ZAPRUDA" },
      { name: "description", content: "Отчёты, трофеи и подписки рыболова." },
      { property: "og:title", content: "Профиль рыболова — ZAPRUDA" },
      { property: "og:description", content: "Отчёты, трофеи и подписки рыболова." },
    ],
  }),
  component: Profile,
});

const achievements = [
  { symbol: "01", title: "Первый заброс", description: "Начало рыболовного пути", state: "Старт" },
  { symbol: "02", title: "Первый улов", description: "Опубликуй отчёт с пойманной рыбой", state: "Впереди" },
  { symbol: "03", title: "Летописец", description: "Добавь фото к 5 отчётам", state: "Впереди" },
  { symbol: "04", title: "Жаркий сезон", description: "Выезжай на рыбалку несколько раз подряд", state: "Впереди" },
  { symbol: "05", title: "Трофей", description: "Отметь личный рекорд", state: "Впереди" },
  { symbol: "06", title: "Свой в тусовке", description: "Получи первые 10 реакций от сообщества", state: "Впереди" },
];

function AchievementMark({ symbol, locked }: { symbol: string; locked: boolean }) {
  return (
    <div className={`relative flex size-14 shrink-0 items-center justify-center rounded-2xl border ${locked ? "border-zinc-700 bg-zinc-900 text-zinc-600" : "border-lime-300/50 bg-lime-300/10 text-lime-300"}`}>
      <svg viewBox="0 0 48 48" className="absolute inset-1 size-12" fill="none" aria-hidden="true">
        <path d="M24 3 40 12V31L24 41 8 31V12L24 3Z" stroke="currentColor" strokeWidth="1.25" />
        <path d="M24 8 35 14.5V28L24 35 13 28V14.5L24 8Z" stroke="currentColor" strokeWidth="0.8" />
        <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1" opacity=".65" />
      </svg>
      <span className="relative text-[10px] font-bold tracking-widest">{symbol}</span>
    </div>
  );
}

function Profile() {
  return (
    <Shell>
      <div className="panel mb-6 flex items-center gap-4 p-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary text-3xl">🎣</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Рыболовный профиль</p>
          <h1 className="mt-1 text-xl font-bold">Мой профиль 🐟</h1>
          <p className="mt-1 text-sm text-muted-foreground">Трофеи, выезды и достижения — всё в одном месте.</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>📝 Отчёты —</span><span>👥 Подписчики —</span><span>🎯 Подписки —</span>
          </div>
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Прогресс · коллекция знаков</p>
            <h2 className="mt-1 text-xl font-bold">Рыболовные достижения</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">0 / {achievements.length} открыто</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a, i) => (
            <article key={a.title} className={`panel flex gap-3 p-4 ${i === 0 ? "border-primary/40 bg-primary/5" : "opacity-90"}`}>
              <AchievementMark symbol={a.symbol} locked={a.state !== "Старт"} />
              <div className="min-w-0">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                <p className="mt-2 text-xs font-semibold text-primary">{a.state === "Старт" ? "ГОТОВ К СТАРТУ" : "ЗАКРЫТО · " + a.state.toUpperCase()}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <NotConnected what="Реальные данные профиля, отчёты, трофеи и автоматическое открытие достижений" />
    </Shell>
  );
}
