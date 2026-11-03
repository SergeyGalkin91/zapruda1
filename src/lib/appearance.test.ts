import { describe, expect, it } from "vitest";
import {
  APP_BACKGROUNDS,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
} from "./appearance";

describe("appearance background choices", () => {
  it("keeps the matte-black classic as the default", () => {
    expect(DEFAULT_APPEARANCE.background).toBe("classic");
    expect(APP_BACKGROUNDS[0]?.value).toBe("classic");
  });

  it("accepts the optional bright-blue background without changing chat", () => {
    expect(APP_BACKGROUNDS.some(item => item.value === "bright-blue")).toBe(true);
    expect(normalizeAppearance({ background: "bright-blue", chat: "water" }))
      .toEqual({ background: "bright-blue", chat: "water" });
  });

  it("falls back to classic for invalid stored backgrounds", () => {
    expect(normalizeAppearance({ background: "unknown", chat: "plain" }).background).toBe("classic");
  });
});
