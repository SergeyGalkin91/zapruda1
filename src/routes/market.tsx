import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BadgeCheck, Camera, MapPin, PackageCheck, ShieldCheck, Wrench } from "lucide-react";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Барахолка — в разработке | ZAPRUDA" },
      {
        name: "description",
        content: "Барахолка ZAPRUDA готовится к запуску. В будущем здесь можно будет покупать и продавать рыболовные снасти.",
      },
    ],
  }),
  component: MarketComingSoon,
});

const plannedFeatures = [
  {
    icon: PackageCheck,
    number: "01",
    title: "Снасти от рыболовов",
    text: "Спиннинги, катушки, приманки и экипировка в одном месте — с понятными категориями и ценами.",
  },
  {
    icon: Camera,
    number: "02",
    title: "Подробные объявления",
    text: "Фотографии, описание состояния, характеристики товара и информация о продавце.",
  },
  {
    icon: MapPin,
    number: "03",
    title: "Поиск по городам",
    text: "Предложения поблизости, фильтры и удобный способ договориться о передаче снастей.",
  },
  {
    icon: ShieldCheck,
    number: "04",
    title: "Безопасность",
    text: "Жалобы на объявления, модерация, правила размещения и защита от спама.",
  },
];

function MarketComingSoon() {
  return (
    <Shell>
      <section className="relative overflow-hidden rounded-3xl border border-lime-300/20 bg-[#10120c] px-5 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-lime-300/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-72 rounded-full bg-lime-300/[0.04] blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-lime-300">
            <Wrench aria-hidden="true" className="size-3.5" />
            Раздел в разработке
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">ZAPRUDA / MARKETPLACE</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl">
            Барахолка <span className="text-lime-300">для своих.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-300">
            Место, где рыболовы смогут покупать и продавать снасти друг другу. Идею сохраняем, но
            запускать недоработанный раздел не будем.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-extrabold text-[#10120c] transition hover:bg-lime-200"
            >
              Вернуться в ленту <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <span className="text-sm text-zinc-500">Объявления пока недоступны</span>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-9 -right-3 hidden select-none text-[11rem] font-black leading-none tracking-[-0.12em] text-lime-300/[0.05] lg:block" aria-hidden="true">
          Z.
        </div>
      </section>

      <section className="mt-10" aria-labelledby="market-plans-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Что появится здесь</p>
            <h2 id="market-plans-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Разрабатываем с умом</h2>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400">Планы, не готовые функции</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {plannedFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.number} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-lime-300/25 sm:p-6">
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-lime-300/25 bg-lime-300/[0.06] text-lime-300">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-zinc-600">{feature.number}</span>
                </div>
                <h3 className="text-base font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#151711] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <BadgeCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-lime-300" strokeWidth={1.7} />
          <div>
            <h2 className="font-bold">Сначала — надёжная основа</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-400">
              Сейчас приоритет у ленты рыбалок, фотоотчётов, общения и профилей. К барахолке вернёмся,
              когда будут готовы безопасность, модерация и удобный процесс публикации.
            </p>
          </div>
        </div>
        <Link to="/reports/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-lime-300/35 px-4 py-3 text-sm font-bold text-lime-300 transition hover:bg-lime-300/10">
          Новый отчёт <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </Shell>
  );
}
