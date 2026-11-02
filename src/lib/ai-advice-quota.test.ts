import { describe, expect, it } from "vitest";
import { canAttemptAdvice, moscowAdviceDay, sanitizeAdvicePromptPart } from "./ai-advice-quota";

describe("ai-advice-quota", () => {
  it("formats Moscow day as YYYY-MM-DD", () => {
    const d = moscowAdviceDay(new Date("2026-11-02T22:30:00+03:00"));
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("blocks ready and excessive failures", () => {
    expect(canAttemptAdvice({ status: "ready" }).ok).toBe(false);
    expect(canAttemptAdvice({ status: "failed", attempts: 3 }).ok).toBe(false);
    expect(canAttemptAdvice({ status: "failed", attempts: 1 }).ok).toBe(true);
  });

  it("sanitizes prompt parts", () => {
    expect(sanitizeAdvicePromptPart("  Волга\x00  ", 10)).toBe("Волга");
  });
});
