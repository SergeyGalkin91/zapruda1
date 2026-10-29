// Compact ZAPRUDA brand mark: restrained neon accent and a soft type shadow.
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 48 24" className="h-6 w-12 text-foreground" aria-hidden="true">
        <path d="M3 12 C10 4 23 5 33 9 L44 4 L41 12 L44 20 L33 15 C23 19 10 20 3 12 Z"
          fill="currentColor" stroke="#D7FF00" strokeWidth="1.15" strokeLinejoin="round" />
        <circle cx="10" cy="10.5" r="1.25" fill="#D7FF00" />
        <path d="M17 7.5 Q22 12 17 16.5" fill="none" stroke="#D7FF00" strokeWidth="0.8" opacity="0.75" />
      </svg>
      <span className="font-display text-lg font-extrabold tracking-[0.08em] text-foreground [text-shadow:0_1px_8px_rgba(215,255,0,0.13)]">ZAPRUDA</span>
    </span>
  );
}
