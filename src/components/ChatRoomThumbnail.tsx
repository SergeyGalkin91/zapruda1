import { useEffect, useState, type ReactNode } from "react";

/** Decorative room artwork only; never use this timeout for user report/chat media. */
export function ChatRoomThumbnail({ src, fallback }: { src: string; fallback: ReactNode }) {
  // The keyed child gives each URL its own lifecycle, including late image events.
  return <RoomImage key={src} src={src} fallback={fallback} />;
}

function RoomImage({ src, fallback }: { src: string; fallback: ReactNode }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => setState("failed"), 5000);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <span
      className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#34435E] bg-[#151925] shadow-[0_4px_16px_rgba(0,0,0,.28)]"
      aria-hidden="true"
    >
      {state !== "failed" && (
        <img
          src={src}
          loading="lazy"
          alt=""
          className={`absolute inset-0 size-full object-cover ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
      {state !== "loaded" && (
        <span className="relative z-10 text-2xl text-[#D7FF35]">{fallback}</span>
      )}
    </span>
  );
}
