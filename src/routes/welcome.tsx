import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Settings2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Добро пожаловать — ZAPRUDA COMMUNITY" },
      { name: "description", content: "Свои на одной волне. Сообщество всех, кто живёт рыбалкой." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <Shell screen="welcome">
      <section className="z-welcome" aria-labelledby="welcome-heading">
        <div className="z-welcome-orbit" aria-hidden="true" />
        <p className="z-eyebrow">РЫБАЛКА. ЛЮДИ. СВОЯ ВОДА.</p>
        <div className="z-welcome-brand">
          <Wordmark stacked />
        </div>
        <h1 id="welcome-heading">Свои на одной волне.</h1>
        <p className="z-welcome-description">
          От первого заброса до своей истории.
          <br />
          Лови моменты. Находи своих.
        </p>
        <div className="z-welcome-actions">
          <Link to="/auth" search={{ mode: "in" }} className="btn-primary">
            Войти в ZAPRUDA <ArrowRight className="size-4" />
          </Link>
          <Link to="/" className="btn-ghost">
            Смотреть ленту
          </Link>
        </div>
        <div className="z-welcome-links">
          <Link to="/communities">
            <Compass className="size-4" /> Найти сообщество
          </Link>
          <Link to="/settings">
            <Settings2 className="size-4" /> Оформление
          </Link>
        </div>
        <p className="z-welcome-footnote">SPINNING / FEEDER / CARP / WINTER / BOAT</p>
      </section>
    </Shell>
  );
}
