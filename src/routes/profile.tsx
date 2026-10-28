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
  { emoji: "🎣", title: "Первый заброс", description: "Начало рыболовного пути", state: "Старт" },
  { emoji: "🐟", title: "Первый улов", description: "Опубликуй отчёт с пойманной рыбой", state: "Впереди" },
  { emoji: "📸", title: "Летописец", description: "Добавь фото к 5 отчётам", state: "Впереди" },
  { emoji: "🔥", title: "Жаркий сезон", description: "Выезжай на рыбалку несколько раз подряд", state: "Впереди" },
  { emoji: "🏆", title: "Трофей", description: "Отметь личный рекорд", state: "Впереди" },
  { emoji: "🤝", title: "Свой в тусовке", description: "Получи первые 10 реакций от сообщества", state: "Впереди" },
];

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">🏅 Прогресс</p>
            <h2 className="mt-1 text-xl font-bold">Рыболовные достижения</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">0 / {achievements.length} открыто</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a, i) => (
            <article key={a.title} className={`panel flex gap-3 p-4 ${i === 0 ? "border-primary/40 bg-primary/5" : "opacity-90"}`}>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">{a.emoji}</div>
              <div className="min-w-0">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                <p className="mt-2 text-xs font-semibold text-primary">{a.state === "Старт" ? "✨ Готов к старту" : "🔒 " + a.state}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <NotConnected what="Реальные данные профиля, отчёты, трофеи и автоматическое открытие достижений" />
    </Shell>
  );
}
