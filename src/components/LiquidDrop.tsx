import { Link } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { LiquidDropArtwork } from "./LiquidDropArtwork";

const sections = [
  { to: "/", label: "Лента" },
  { to: "/communities", label: "Вокруг" },
  { to: "/competitions", label: "SPOT" },
] as const;

export type LiquidSectionRoute = (typeof sections)[number]["to"];
let nextSectionMotion: { to: LiquidSectionRoute; from: number; expires: number } | undefined;

export function LiquidDrop({
  active,
  columns,
  enteringFrom,
}: {
  active: number;
  columns: number;
  enteringFrom?: number | undefined;
}) {
  const indicator = useRef<HTMLSpanElement>(null);
  const previous = useRef(enteringFrom ?? active);

  useLayoutEffect(() => {
    const source = previous.current;
    previous.current = active;
    const node = indicator.current;
    if (
      !node ||
      source === active ||
      document.documentElement.dataset["zaprudaLiquidMotion"] === "off" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const old = node.parentElement?.querySelector(`[data-liquid-choice="${source}"]`);
    if (!old) return;
    const start = old.getBoundingClientRect();
    const end = node.getBoundingClientRect();
    const x = start.left - end.left;
    const y = start.top - end.top;
    const axis = Math.abs(x) >= Math.abs(y) ? "scaleX" : "scaleY";
    const move = node.animate?.(
      [
        { transform: `translate(${x}px, ${y}px) ${axis}(1)` },
        { transform: `translate(${x * 0.48}px, ${y * 0.48}px) ${axis}(1.17)`, offset: 0.45 },
        { transform: "translate(0, 0) scale(1)" },
      ],
      { duration: 360, easing: "cubic-bezier(.22,.7,.25,1)" },
    );
    return () => move?.cancel();
  }, [active]);

  return (
    <span
      ref={indicator}
      aria-hidden="true"
      className="z-liquid-indicator"
      style={{
        gridColumn: `${(active % columns) + 1} / span 1`,
        gridRow: `${Math.floor(active / columns) + 1} / span 1`,
      }}
    >
      <LiquidDropArtwork />
    </span>
  );
}

export function LiquidSectionNav({ route }: { route: LiquidSectionRoute }) {
  const active = sections.findIndex((section) => section.to === route);
  const entry = useRef(nextSectionMotion);
  const motion = entry.current;
  useLayoutEffect(() => {
    if (nextSectionMotion?.to === route) nextSectionMotion = undefined;
  }, [route]);
  return (
    <nav className="z-liquid-track" aria-label="Разделы сообщества">
      <LiquidDrop
        active={active}
        columns={3}
        enteringFrom={motion?.to === route && motion.expires > Date.now() ? motion.from : undefined}
      />
      {sections.map(({ to, label }, index) => (
        <Link
          key={to}
          to={to}
          data-liquid-choice={index}
          aria-current={index === active ? "page" : undefined}
          onClick={(event) => {
            if (
              !event.defaultPrevented &&
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey &&
              index !== active
            )
              nextSectionMotion = { to, from: active, expires: Date.now() + 3000 };
          }}
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
      <LiquidDrop active={active} columns={3} />
      {sections.map(({ label }, index) => (
        <button
          key={label}
          type="button"
          data-liquid-choice={index}
          aria-pressed={active === index}
          onClick={() => setActive(index)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
