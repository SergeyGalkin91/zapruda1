import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Camera, MapPinned, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/spot")({
  head: () => ({
    meta: [
      { title: "СПОТ — ZAPRUDA" },
      {
        name: "description",
        content: "Покажи улов, найди клуб или собери вечерний стрит.",
      },
    ],
  }),
  component: SpotHub,
});

const cards = [
  {
    to: "/reports/new" as const,
    title: "Покажи свой улов",
    text: "Фото, история и результат рыбалки",
    Icon: Camera,
    accent: "border-[#D7FF35]/40 bg-[#D7FF35]/10 hover:border-[#D7FF35]",
  },
  {
    to: "/communities" as const,
    search: { tab: "clubs" as const },
    title: "Найти клуб",
    text: "Команды и рыболовные клубы",
    Icon: Building2,
    accent: "border-[#A99AD9]/40 bg-[#A99AD9]/10 hover:border-[#A99AD9]",
  },
  {
    to: "/partners" as const,
    title: "Собрать вечерний стрит",
    text: "Небольшая компания на район и время",
    Icon: MapPinned,
    accent: "border-white/15 bg-[#121A12] hover:border-[#D7FF35]/50",
  },
];

function SpotHub() {
  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D7FF35]">
          ZAPRUDA · СПОТ
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Куда идёшь сегодня?
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Три главных действия. Лента, чаты и остальное — рядом, без путаницы.
        </p>

        <div className="mt-6 space-y-3">
          {cards.map((card) => (
            <Link
              key={card.title}
              to={card.to}
              search={"search" in card ? card.search : undefined}
              className={`flex items-center gap-4 rounded-2xl border p-4 transition ${card.accent}`}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-[#D7FF35]">
                <card.Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-white">{card.title}</span>
                <span className="mt-0.5 block text-sm text-zinc-400">{card.text}</span>
              </span>
              <span className="text-lg text-[#D7FF35]" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>

        <Link
          to="/"
          className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-[#101410] px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-[#D7FF35]/40 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4 text-[#D7FF35]" aria-hidden="true" />
            Лента уловов
          </span>
          <span className="text-[#D7FF35]">→</span>
        </Link>
      </div>
    </Shell>
  );
}
