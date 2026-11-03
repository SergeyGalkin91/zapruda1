import { afterEach, describe, expect, it, vi } from "vitest";
import { localDateTimeToIso, toLocalDateTimeInput } from "./meetup-datetime";

afterEach(() => vi.unstubAllEnvs());
describe("meeting time in a datetime-local field", () => {
  it.each(["Europe/Moscow", "Asia/Almaty", "America/New_York"])(
    "does not move an unchanged meeting in %s",
    (timezone) => {
      vi.stubEnv("TZ", timezone);
      const iso = new Date(2026, 10, 3, 19, 0).toISOString();
      expect(toLocalDateTimeInput(iso)).toBe("2026-11-03T19:00");
      expect(localDateTimeToIso(toLocalDateTimeInput(iso))).toBe(iso);
    },
  );
  it("handles the local date across a UTC midnight boundary", () => {
    vi.stubEnv("TZ", "Europe/Moscow");
    expect(toLocalDateTimeInput("2026-11-03T22:30:00.000Z")).toBe("2026-11-04T01:30");
  });
  it("allows clearing the optional time", () => {
    expect(toLocalDateTimeInput(null)).toBe("");
    expect(localDateTimeToIso("")).toBeNull();
  });
  it("rejects impossible dates instead of rolling them to another day", () => {
    expect(() => localDateTimeToIso("2026-02-30T19:00")).toThrow("корректное");
    expect(() => localDateTimeToIso("invalid")).toThrow("корректное");
    expect(toLocalDateTimeInput("invalid")).toBe("");
  });
});
