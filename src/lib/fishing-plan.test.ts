import { describe, expect, it, vi } from "vitest";
import { buildFishingPlan, prepareAdviceInput } from "./fishing-plan";
const input = { location: "Ока", target: "Окунь", time: "Утро", notes: "" };

describe("Independent fishing plan", () => {
  it("works without a network request and labels its real source", () => {
    const network = vi.spyOn(globalThis, "fetch");
    try {
      const plan = buildFishingPlan(input);
      expect(plan.source).toBe("rules");
      expect(plan.sections).toHaveLength(4);
      expect(plan.sections.every((section) => section.text.length > 40)).toBe(true);
      expect(network).not.toHaveBeenCalled();
      expect(plan).not.toHaveProperty("advice_day");
      expect(plan).not.toHaveProperty("model");
    } finally {
      network.mockRestore();
    }
  });
  it("changes the starting plan for the selected target and night conditions", () => {
    const pike = buildFishingPlan({ ...input, target: "Щука", time: "Ночь" });
    expect(pike.sections[0]).not.toEqual(buildFishingPlan(input).sections[0]);
    expect(pike.sections.at(-1)?.title).toBe("Ночной выход");
    expect(pike.input.location).toBe("Ока");
  });
  it.each(["", " ", "А"])("rejects an unusable place %j", (location) => {
    expect(() => buildFishingPlan({ ...input, location })).toThrow("минимум два символа");
  });
  it("bounds input and treats unknown selectors as defaults", () => {
    const cleaned = prepareAdviceInput({
      location: "  " + "Я".repeat(200),
      target: "unknown",
      time: "unknown",
      notes: "x".repeat(500),
    });
    expect(cleaned.location).toHaveLength(140);
    expect(cleaned.notes).toHaveLength(400);
    expect(cleaned.target).toBe("Любой хищник");
    expect(cleaned.time).toBe("Утро");
    expect(
      prepareAdviceInput({ ...input, location: "Ока\nберег", notes: "a\u0000b" }),
    ).toMatchObject({ location: "Ока берег", notes: "a b" });
  });
});
