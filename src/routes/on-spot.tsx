import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { BrandFish } from "@/components/Wordmark";

export const Route = createFileRoute("/on-spot")({
  head: () => ({ meta: [{ title: "ON SPOT+ — рыбаки рядом | ZAPRUDA" }] }),
  component: OnSpotEntry,
});
/** Honest entry until moderated local zones and opt-in memberships exist. Not OSP acceptance. */
function OnSpotEntry() {
  return (
    <Shell screen="spot">
      <header className="z-screen-heading">
        <div>
          <p className="z-eyebrow">ЛЮДИ. СВОЯ ВОДА.</p>
          <h1>ON SPOT+</h1>
        </div>
      </header>
      <p className="z-screen-description">
        Локальные знакомства на рыбалке — по взаимному желанию. Просмотр карты не делает тебя
        видимым другим людям.
      </p>
      <section className="z-premium-card p-6">
        <BrandFish className="z-empty-fish" />
        <h2 className="mt-4 text-xl font-bold">Локальные зоны ещё не открыты</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Присоединяйся к общему чату или найди компанию на выезд. Твоё местоположение здесь не
          запрашивается и не публикуется.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a className="btn-primary" href="/chat?country=&place=&topic=general">
            В общий чат
          </a>
          <a className="btn-ghost" href="/partners">
            Найти напарника
          </a>
          <a className="btn-ghost" href="/communities#community-meetups">
            СХОДКИ
          </a>
          <a className="btn-ghost" href="/competitions#approved-spot-map">
            Карта SPOT
          </a>
        </div>
      </section>
    </Shell>
  );
}
