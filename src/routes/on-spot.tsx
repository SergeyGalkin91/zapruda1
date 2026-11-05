import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { OnSpotZones } from "@/components/OnSpotZones";

export const Route = createFileRoute("/on-spot")({
  head: () => ({ meta: [{ title: "ON SPOT+ — рыбаки рядом | ZAPRUDA" }] }),
  component: OnSpotEntry,
});
/** First catalog/membership slice; not full OSP-01…09 acceptance. */
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
      <OnSpotZones />
      <section className="mt-5">
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
