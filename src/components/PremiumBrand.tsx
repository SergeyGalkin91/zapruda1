import masters from "@/lib/brand-masters.json";

/** Outlines from the owner's approved logo; no substituted wordmark font. */
export function BrandFish({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={masters.fish.viewBox}
      className={className}
      aria-hidden="true"
      fill="currentColor"
      fillRule="evenodd"
    >
      <path d={masters.fish.path} />
    </svg>
  );
}

export function Wordmark({
  variant = "community",
  stacked = false,
}: {
  variant?: "community" | "spot" | "brand";
  stacked?: boolean;
}) {
  const label = variant === "brand" ? "ZAPRUDA" : "ZAPRUDA " + variant.toUpperCase();
  return (
    <span className={"z-brand" + (stacked ? " z-brand-stacked" : "")} role="img" aria-label={label}>
      <BrandFish className="z-brand-fish" />
      <span className="z-brand-type">
        <svg
          viewBox={masters.wordmark.viewBox}
          className="z-brand-word"
          aria-hidden="true"
          fill="currentColor"
          fillRule="evenodd"
        >
          <path d={masters.wordmark.path} />
        </svg>
        {variant !== "brand" && (
          <span className="z-brand-subtitle" aria-hidden="true">
            {variant}
          </span>
        )}
      </span>
    </span>
  );
}
