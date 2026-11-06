import { CircleAlert, LoaderCircle } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScreenState({
  kind,
  children,
  className,
  onRetry,
  retryLabel = "Попробовать снова",
}: {
  kind: "loading" | "empty" | "error";
  children: ReactNode;
  className?: string;
  onRetry?: (() => void) | undefined;
  retryLabel?: string;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "z-premium-card p-4 text-sm leading-6 text-muted-foreground",
        kind === "error" && "border-destructive/40 text-foreground",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {kind === "loading" && (
          <LoaderCircle
            className="mt-0.5 size-5 shrink-0 text-primary motion-safe:animate-spin"
            aria-hidden="true"
          />
        )}
        {kind === "error" && (
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        )}
        <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
      </div>
      {onRetry && (
        <button type="button" className="btn-ghost mt-3" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
