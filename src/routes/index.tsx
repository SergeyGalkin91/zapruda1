import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, NotConnected } from "@/components/Shell";

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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Спиннинг · отчёты</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Лента рыбалок</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Реальные выезды: где, на что и при какой погоде клевало.
          </p>
        </div>
        <Link to="/reports/new" className="btn-primary self-start">+ Новый отчёт</Link>
      </section>
      <NotConnected what="Отчёты, уловы, комментарии и реакции" />
    </Shell>
  );
}
