import { describe, expect, it } from "vitest";
import {
  canAttemptAdvice,
  interpretClaimResult,
  moscowAdviceDay,
  sanitizeAdvicePromptPart,
} from "./ai-advice-quota";

describe("ai-advice-quota", () => {
  it("formats Moscow day as YYYY-MM-DD", () => {
    const d = moscowAdviceDay(new Date("2026-11-02T22:30:00+03:00"));
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("blocks ready, lease, and excessive failures", () => {
    expect(canAttemptAdvice({ status: "ready" }).ok).toBe(false);
    expect(canAttemptAdvice({ status: "pending", leaseHeld: true }).reason).toBe("lease_held");
    expect(canAttemptAdvice({ status: "failed", attempts: 3 }).ok).toBe(false);
    expect(canAttemptAdvice({ status: "failed", attempts: 1 }).ok).toBe(true);
  });

  it("interprets claim RPC outcomes", () => {
    expect(interpretClaimResult({ ok: true }).allowGenerate).toBe(true);
    expect(interpretClaimResult({ ok: false, reason: "already_used" }).httpHint).toBe(200);
    expect(interpretClaimResult({ ok: false, reason: "lease_held" }).httpHint).toBe(409);
    expect(interpretClaimResult({ ok: false, reason: "too_many_failures" }).httpHint).toBe(429);
  });

  it("sanitizes prompt parts", () => {
    expect(sanitizeAdvicePromptPart("  Волга\x00  ", 10)).toBe("Волга");
  });

  it("preserves multiline text and emoji while removing control bytes", () => {
    expect(sanitizeAdvicePromptPart("Волга\nЩука\t🎣\r\x00\x0b\x1f", 100)).toBe("Волга\nЩука\t🎣");
  });
});
