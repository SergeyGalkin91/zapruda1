// Temporary text mark — replace with the original ZAPRUDA SPINNING logo when available.
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 48 20" className="h-5 w-12" aria-hidden>
        <path d="M2 10 Q14 2 30 6 L44 3 L40 10 L44 17 L30 14 Q14 18 2 10 Z"
          fill="currentColor" stroke="var(--color-primary)" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="1.2" fill="var(--color-primary)" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">ZAPRUDA</span>
    </span>
  );
}
