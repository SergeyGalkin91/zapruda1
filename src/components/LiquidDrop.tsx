import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ActiveSelectionIndicator } from "./ActiveSelectionIndicator";

const sections = [
  { to: "/", label: "Лента" },
  { to: "/communities", label: "Вокруг" },
  { to: "/competitions", label: "SPOT" },
] as const;

export type LiquidSectionRoute = (typeof sections)[number]["to"];

export function LiquidSectionNav({ route }: { route: LiquidSectionRoute }) {
  return (
    <nav className="z-liquid-track" aria-label="Разделы сообщества">
      <ActiveSelectionIndicator routeGroup="main-sections" />
      {sections.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: true, includeSearch: false }}
          aria-current={to === route ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function LiquidDropPreview() {
  const [active, setActive] = useState(0);
  return (
    <div className="z-liquid-track" role="group" aria-label="Предпросмотр выделения">
      <ActiveSelectionIndicator />
      {sections.map(({ label }, index) => (
        <button
          key={label}
          type="button"
          aria-pressed={active === index}
          onClick={() => setActive(index)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
