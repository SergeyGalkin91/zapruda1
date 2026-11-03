import { afterEach, describe, expect, it } from "vitest";
import {
  APP_BACKGROUNDS, APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE,
  applyAppearance, loadAppearance, normalizeAppearance, saveAppearance,
} from "./appearance";

afterEach(() => {
  window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
  delete document.documentElement.dataset.zaprudaBackground;
  delete document.documentElement.dataset.zaprudaChat;
});

describe("ZAPRUDA optional bright-blue background", () => {
  it("keeps matte black as the default theme", () => {
    expect(DEFAULT_APPEARANCE).toEqual({ background: "classic", chat: "plain" });
    expect(APP_BACKGROUNDS[0].value).toBe("classic");
  });

  it("offers bright blue alongside existing background choices", () => {
    const backgrounds = APP_BACKGROUNDS.map((item) => item.value);
    expect(backgrounds).toContain("bright-blue");
    expect(backgrounds).toEqual(expect.arrayContaining(["classic", "forest", "graphite", "night"]));
    expect(APP_BACKGROUNDS.find((item) => item.value === "bright-blue")?.title).toBe("Яркий синий");
  });

  it("accepts the new option but rejects unknown values", () => {
    expect(normalizeAppearance({ background: "bright-blue", chat: "plain" }).background).toBe("bright-blue");
    expect(normalizeAppearance({ background: "invalid", chat: "plain" }).background).toBe("classic");
  });

  it("applies and persists bright blue, and allows returning to matte black", () => {
    const blue = { background: "bright-blue" as const, chat: "plain" as const };
    expect(saveAppearance(blue)).toBe(true);
    expect(document.documentElement.dataset.zaprudaBackground).toBe("bright-blue");
    expect(loadAppearance()).toEqual(blue);

    applyAppearance(DEFAULT_APPEARANCE);
    expect(document.documentElement.dataset.zaprudaBackground).toBe("classic");
    expect(saveAppearance(DEFAULT_APPEARANCE)).toBe(true);
    expect(loadAppearance().background).toBe("classic");
  });
});
