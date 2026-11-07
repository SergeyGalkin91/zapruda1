import { Link, useLocation } from "@tanstack/react-router";
import { ActiveSelectionIndicator } from "./ActiveSelectionIndicator";

export function ScreenSectionNav({
  route,
  label,
  sections,
}: {
  route: "/communities" | "/competitions";
  label: string;
  sections: ReadonlyArray<{ id: string; label: string }>;
}) {
  const hash = useLocation({ select: (location) => location.hash });
  const current = sections.find(({ id }) => id === hash)?.id ?? sections[0]?.id;
  return (
    <nav className="z-segments" aria-label={label}>
      <ActiveSelectionIndicator />
      {sections.map(({ id, label: sectionLabel }) => (
        <Link
          key={id}
          to={route}
          hash={id}
          activeOptions={{ includeHash: true }}
          aria-current={current === id ? "page" : undefined}
        >
          {sectionLabel}
        </Link>
      ))}
    </nav>
  );
}
