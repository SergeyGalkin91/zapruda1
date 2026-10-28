import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, NotConnected } from "@/components/Shell";
import { ReactionBar } from "@/components/ReactionBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZAPRUDA — лента рыболовных отчётов" },
      { name: "description", content: "Отчёты спиннингистов: водоёмы, приманки, погода и улов." },
      { property: "og:title", content: "ZAPRUDA — лента рыболовных отчётов" },
      { property: "og:description", content: "Отчёты спиннингистов: водоёмы, приманки, погода и улов." },
    ],
  }),
  component: Feed,
});

function Feed() {
  return (
    <Shell>
      <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">🎣 Спиннинг · отчёты</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Лента рыбалок 🐟</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Реальные выезды: где, на что и при какой погоде клевало. Делись победами и фейлами 😂
          </p>
        </div>
        <Link to="/reports/new" className="btn-primary self-start">🎣 Новый отчёт</Link>
      </section>

      <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
        ✨ Реакции уже можно потыкать в интерфейсе. Пока это демонстрационный режим: публикации и реакции ещё не сохраняются в базе.
      </div>

      <article className="panel mb-5 space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">🎣</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Рыболов ZAPRUDA</div>
            <div className="text-xs text-muted-foreground">Пример карточки отчёта · демо</div>
          </div>
          <span className="rounded-full bg-secondary px-2 py-1 text-xs">🐟 Улов</span>
        </div>
        <div>
          <h2 className="text-lg font-bold">Утренний выход на хищника 🌅</h2>
          <p className="mt-2 text-sm text-muted-foreground">Пробуем джиг у бровки, меняем темп проводки и ищем активную рыбу. А у вас как клёв?</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1.5">📍 Река</span>
          <span className="rounded-full bg-secondary px-3 py-1.5">🌬️ Ветер</span>
          <span className="rounded-full bg-secondary px-3 py-1.5">🪱 Джиг</span>
        </div>
        <ReactionBar />
        <div className="border-t pt-3">
          <p className="mb-2 text-sm font-semibold">💬 Комментарии</p>
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <span className="font-semibold">Спиннингист:</span> Ни хвоста ни чешуи! 🤝
            <div className="mt-3"><ReactionBar compact /></div>
          </div>
        </div>
      </article>

      <NotConnected what="Настоящие отчёты, уловы, комментарии и сохранение реакций" />
    </Shell>
  );
}
