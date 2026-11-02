/** Pure helpers for Grok daily advice quota (testable without Edge runtime). */

export function moscowAdviceDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function canAttemptAdvice(args: {
  status?: string | null;
  attempts?: number | null;
  maxFailedAttempts?: number;
}): { ok: boolean; reason?: string } {
  const maxFail = args.maxFailedAttempts ?? 3;
  if (args.status === "ready") return { ok: false, reason: "already_used" };
  if ((args.attempts ?? 0) >= maxFail && args.status === "failed") {
    return { ok: false, reason: "too_many_failures" };
  }
  return { ok: true };
}

export function sanitizeAdvicePromptPart(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}
