import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { CatchJourneyNav } from "@/components/CatchJourneyNav";
import { SpotCatchFlow } from "@/components/SpotCatchFlow";
import { SpotVerifiedProgress } from "@/components/SpotVerifiedProgress";

export const Route = createFileRoute("/big-fish")({
  head: () => ({ meta: [{ title: "BIG FISH — улов, проверка и KING | ZAPRUDA" }] }),
  component: BigFishPage,
});
function BigFishPage() {
  return (
    <Shell screen="spot">
      <header className="z-screen-heading">
        <div>
          <p className="z-eyebrow">ZARUBA / ОДНА РЫБА</p>
          <h1>BIG FISH</h1>
        </div>
      </header>
      <p className="z-screen-description">
        Выбери одну рыбу. Приложи доказательство. Следи за независимой проверкой и подтверждёнными
        титулами.
      </p>
      <CatchJourneyNav />
      <SpotCatchFlow allowReportHandoff />
      <SpotVerifiedProgress id="my-catches" />
      <a className="btn-ghost" href="/profile#verified-titles">
        Титулы в моём профиле
      </a>
    </Shell>
  );
}
