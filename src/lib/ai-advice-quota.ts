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
  leaseHeld?: boolean;
}): { ok: boolean; reason?: string } {
  const maxFail = args.maxFailedAttempts ?? 3;
  if (args.status === "ready") return { ok: false, reason: "already_used" };
  if (args.leaseHeld) return { ok: false, reason: "lease_held" };
  if ((args.attempts ?? 0) >= maxFail && args.status === "failed") {
    return { ok: false, reason: "too_many_failures" };
  }
  return { ok: true };
}

/** Map claim RPC payload to user-facing gate (mirrors edge function branches). */
export function interpretClaimResult(claim: { ok?: boolean; reason?: string; answer?: string }): {
  allowGenerate: boolean;
  httpHint?: number;
  reason?: string;
} {
  if (claim.ok) return { allowGenerate: true };
  if (claim.reason === "already_used")
    return { allowGenerate: false, httpHint: 200, reason: "already_used" };
  if (claim.reason === "too_many_failures")
    return { allowGenerate: false, httpHint: 429, reason: "too_many_failures" };
  if (claim.reason === "lease_held")
    return { allowGenerate: false, httpHint: 409, reason: "lease_held" };
  return { allowGenerate: false, httpHint: 500, reason: claim.reason || "unknown" };
}

export function sanitizeAdvicePromptPart(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/./gs, (character) => {
      const code = character.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13 ? "" : character;
    })
    .trim()
    .slice(0, max);
}
