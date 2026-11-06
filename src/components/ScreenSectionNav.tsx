import { Link, useLocation } from "@tanstack/react-router";

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
      {sections.map(({ id, label: sectionLabel }) => (
        <Link
          key={id}
          to={route}
          hash={id}
          activeOptions={{ includeHash: true }}
          activeProps={{ "aria-current": "location" }}
          aria-current={current === id ? "location" : undefined}
        >
          {sectionLabel}
        </Link>
      ))}
    </nav>
  );
}
