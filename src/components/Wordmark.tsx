// ZAPRUDA wordmark — acid-green fish and bold condensed typographic presence.
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 54 32" role="img" aria-label="" className="h-7 w-11 shrink-0 text-[#D7FF35] sm:w-12">
        <path
          d="M3 15.5 C14 4 28 5.5 37 11 L51 3.5 L46 15.5 L51 28 L37 20 C28 26 14 27 3 15.5 Z"
          fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"
        />
        <path d="M3 15.5 C16 8 28 9 37 11" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".75" />
        <circle cx="13" cy="12.8" r="2.15" fill="currentColor" />
        <path d="M20 10.8 Q25 15.6 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".8" />
      </svg>
      <span className="flex flex-col justify-center">
        <span className="font-display text-[14px] font-extrabold tracking-[0.015em] text-[#D7FF35] sm:text-lg">ZAPRUDA</span>
        <span className="-mt-0.5 text-[8px] font-extrabold uppercase tracking-[0.25em] text-[#818B7B] sm:text-[9px]">Community</span>
      </span>
    </span>
  );
}
