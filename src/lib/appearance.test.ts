import { beforeEach, describe, expect, it } from "vitest";
import {
  APP_BACKGROUNDS,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  ELECTRIC_BLUE_CHAT_PREVIEWS,
  applyAppearance,
  loadAppearance,
  normalizeAppearance,
  saveAppearance,
} from "./appearance";

describe("ZAPRUDA appearance preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset["zaprudaBackground"];
    delete document.documentElement.dataset["zaprudaChat"];
  });

  it("defaults to Matte Black without changing chat appearance", () => {
    expect(loadAppearance()).toEqual({ background: "classic", chat: "plain" });
    expect(DEFAULT_APPEARANCE.background).toBe("classic");
    expect(APP_BACKGROUNDS[0]?.title).toBe("Matte Black");
  });

  it("exposes Electric Blue with eggplant and keeps Matte Black's lavender accent", () => {
    const black = APP_BACKGROUNDS.find((item) => item.value === "classic");
    const blue = APP_BACKGROUNDS.find((item) => item.value === "electric-blue");
    expect(black?.secondaryAccent).toBe("#A99AD9");
    expect(blue?.secondaryAccent).toBe("#614051");
    expect(blue?.preview).toContain("#1239A6");
  });

  it("applies Electric Blue immediately and remembers it across a new page session", () => {
    const choice = { background: "electric-blue", chat: "water" } as const;
    expect(saveAppearance(choice)).toBe(true);
    expect(document.documentElement.dataset["zaprudaBackground"]).toBe("electric-blue");
    expect(document.documentElement.dataset["zaprudaChat"]).toBe("water");

    // Session re-initialization / sign-out do not remove the local appearance key.
    const restored = loadAppearance();
    expect(restored).toEqual(choice);
    delete document.documentElement.dataset["zaprudaBackground"];
    delete document.documentElement.dataset["zaprudaChat"];
    applyAppearance(restored);
    expect(document.documentElement.dataset["zaprudaBackground"]).toBe("electric-blue");
  });

  it("returns to Matte Black when the user resets appearance", () => {
    saveAppearance({ background: "electric-blue", chat: "slate" });
    saveAppearance(DEFAULT_APPEARANCE);
    expect(loadAppearance()).toEqual(DEFAULT_APPEARANCE);
    expect(document.documentElement.dataset["zaprudaBackground"]).toBe("classic");
  });

  it("converts legacy green backgrounds to Matte Black and rejects unknown values", () => {
    expect(normalizeAppearance({ background: "forest", chat: "plain" })).toEqual({
      background: "classic",
      chat: "plain",
    });
    expect(normalizeAppearance({ background: "not-a-theme", chat: "water" })).toEqual({
      background: "classic",
      chat: "water",
    });
    expect(normalizeAppearance({ background: "electric-blue", chat: "invalid" })).toEqual({
      background: "electric-blue",
      chat: "plain",
    });
  });

  it("offers only approved Matte Black and Electric Blue backgrounds", () => {
    expect(APP_BACKGROUNDS.map((item) => item.value)).toEqual(["classic", "electric-blue"]);
    expect(normalizeAppearance({ background: "night", chat: "plain" }).background).toBe("classic");
  });

  it("defines only blue/eggplant previews for Electric Blue chat", () => {
    expect(ELECTRIC_BLUE_CHAT_PREVIEWS.forest.title).toBe("Баклажановый");
    expect(ELECTRIC_BLUE_CHAT_PREVIEWS.forest.preview).toContain("#614051");
    expect(ELECTRIC_BLUE_CHAT_PREVIEWS.water.preview).toContain("#1239A6");
    for (const item of Object.values(ELECTRIC_BLUE_CHAT_PREVIEWS)) {
      expect(item.preview).not.toMatch(/#29472B|#101A12|#234750/i);
    }
  });

  it("recovers from invalid saved JSON without breaking app startup", () => {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "{invalid");
    expect(loadAppearance()).toEqual(DEFAULT_APPEARANCE);
  });
});
