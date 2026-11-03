import { describe, expect, it } from "vitest";
import {
  NOMINATION_TITLES,
  evaluateCatchForRecord,
  recordCategoryKey,
  shouldReplaceRecord,
  titleChangedEventKey,
  type ModeratedCatch,
  type RecordCategory,
} from "./spot-records";

const spot: RecordCategory = {
  league: "street",
  nomination: "spot-big-fish",
  method: "shore-spinning",
  scopeType: "spot",
  scopeId: "mizin-01",
};

const verified: ModeratedCatch = {
  catchId: "catch-a",
  ownerId: "angler-1",
  speciesId: "pike",
  method: "shore-spinning",
  scopes: [{ type: "spot", id: "mizin-01" }],
  weightGrams: 3200,
  lengthMm: 780,
  status: "verified",
  proofAccepted: true,
  lawful: true,
};

describe("v0.7.5 SPOT — verified BIG FISH engine", () => {
  it("scores exactly ONE fish in grams and rejects equal or smaller challengers", () => {
    expect(evaluateCatchForRecord(spot, verified)).toMatchObject({
      eligible: true,
      score: 3200,
    });
    expect(shouldReplaceRecord(spot, { ...verified, catchId: "b", weightGrams: 3300 }, verified)).toBe(true);
    expect(shouldReplaceRecord(spot, { ...verified, catchId: "b", weightGrams: 3200 }, verified)).toBe(false);
    expect(shouldReplaceRecord(spot, { ...verified, catchId: "b", weightGrams: 3199 }, verified)).toBe(false);
    expect(shouldReplaceRecord(spot, verified, verified)).toBe(false);
  });

  it("never credits a pending, rejected, unlawful or unproved catch", () => {
    for (const changed of [
      { status: "pending" as const },
      { status: "rejected" as const },
      { status: "revoked" as const },
      { proofAccepted: false },
      { lawful: false },
    ]) {
      expect(evaluateCatchForRecord(spot, { ...verified, ...changed }).eligible).toBe(false);
    }
  });

  it("requires a moderated capture scope rather than trusting a home city", () => {
    expect(evaluateCatchForRecord(spot, { ...verified, scopes: [{ type: "spot", id: "other" }] }).eligible).toBe(false);
    expect(evaluateCatchForRecord(spot, { ...verified, scopes: [{ type: "region", id: "nnov" }] }).eligible).toBe(false);
  });

  it("rejects incompatible methods, missing measurements and invalid numbers", () => {
    expect(evaluateCatchForRecord(spot, { ...verified, method: "boat-spinning" }).eligible).toBe(false);
    for (const weight of [null, 0, -5, 1.2, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(evaluateCatchForRecord(spot, { ...verified, weightGrams: weight }).eligible).toBe(false);
    }
  });

  it("uses maximum measured length, not mass, in LENGTH KING", () => {
    const lengthCategory: RecordCategory = { ...spot, nomination: "spot-longest" };
    expect(
      shouldReplaceRecord(
        lengthCategory,
        { ...verified, catchId: "b", weightGrams: 800, lengthMm: 800 },
        verified,
      ),
    ).toBe(true);
    expect(
      shouldReplaceRecord(
        lengthCategory,
        { ...verified, catchId: "c", weightGrams: 9000, lengthMm: 700 },
        verified,
      ),
    ).toBe(false);
  });

  it("keeps KING OF UL and MICRO KING within one ultralight league", () => {
    const ul: RecordCategory = {
      league: "ultralight",
      nomination: "ul-big-fish",
      method: "ultralight",
      scopeType: "spot",
      scopeId: "lake-01",
    };
    const ulCatch: ModeratedCatch = {
      ...verified,
      method: "ultralight",
      scopes: [{ type: "spot", id: "lake-01" }],
      ultralightGearAccepted: true,
      targetedJuvenile: false,
    };
    const micro: RecordCategory = { ...ul, nomination: "ul-smallest" };
    expect(NOMINATION_TITLES[micro.nomination]).toBe("MICRO KING");
    expect(recordCategoryKey(micro)).not.toEqual(recordCategoryKey(ul));
    expect(shouldReplaceRecord(ul, { ...ulCatch, catchId: "b", weightGrams: 4000 }, ulCatch)).toBe(true);
    expect(shouldReplaceRecord(micro, { ...ulCatch, catchId: "b", lengthMm: 600 }, ulCatch)).toBe(true);
    expect(shouldReplaceRecord(micro, { ...ulCatch, catchId: "b", lengthMm: 800 }, ulCatch)).toBe(false);
    expect(evaluateCatchForRecord(ul, { ...ulCatch, ultralightGearAccepted: false }).eligible).toBe(false);
    expect(evaluateCatchForRecord(micro, { ...ulCatch, targetedJuvenile: true }).eligible).toBe(false);
    expect(evaluateCatchForRecord(micro, { ...ulCatch, targetedJuvenile: undefined }).eligible).toBe(false);
  });

  it("keeps carp and grass carp in distinct verified waterbody rankings", () => {
    const carp: RecordCategory = {
      league: "carpfishing",
      nomination: "carp-big-fish",
      method: "carpfishing",
      scopeType: "waterbody",
      scopeId: "ku zh",
      speciesId: "carp",
    };
    const fish: ModeratedCatch = {
      ...verified,
      speciesId: "carp",
      method: "carpfishing",
      scopes: [{ type: "waterbody", id: "ku zh" }],
    };
    expect(evaluateCatchForRecord(carp, fish).eligible).toBe(true);
    expect(evaluateCatchForRecord({ ...carp, speciesId: "grass-carp" }, fish).eligible).toBe(false);
    expect(recordCategoryKey(carp)).not.toEqual(recordCategoryKey({ ...carp, speciesId: "grass-carp" }));
  });

  it("supports winter region + season WITHOUT any spot or GPS", () => {
    const winter: RecordCategory = {
      league: "winter",
      nomination: "ice-big-fish",
      method: "ice-lure",
      scopeType: "region",
      scopeId: "52",
      speciesId: "zander",
      seasonId: "2026-27",
    };
    const fish: ModeratedCatch = {
      ...verified,
      speciesId: "zander",
      method: "ice-lure",
      scopes: [{ type: "region", id: "52" }],
      seasonId: "2026-27",
    };
    expect(evaluateCatchForRecord(winter, fish).eligible).toBe(true);
    expect(evaluateCatchForRecord(winter, { ...fish, seasonId: "2025-26" }).eligible).toBe(false);
    expect(recordCategoryKey({ ...winter, seasonId: undefined })).toBeNull();
  });

  it("supports separate TROPHY KING scopes without confusing neighboring regions", () => {
    const boat: RecordCategory = {
      league: "boat",
      nomination: "boat-big-fish",
      method: "boat-spinning",
      scopeType: "region",
      scopeId: "52",
      speciesId: "pike",
    };
    const catchOnOka: ModeratedCatch = {
      ...verified,
      method: "boat-spinning",
      weightGrams: 17000,
      scopes: [
        { type: "waterbody", id: "oka" },
        { type: "municipality", id: "dzerzhinsk" },
        { type: "region", id: "52" },
        { type: "country", id: "RU" },
      ],
    };
    expect(evaluateCatchForRecord(boat, catchOnOka).eligible).toBe(true);
    expect(evaluateCatchForRecord({ ...boat, scopeId: "77" }, catchOnOka).eligible).toBe(false);
    expect(evaluateCatchForRecord({ ...boat, speciesId: "zander" }, catchOnOka).eligible).toBe(false);
    expect(evaluateCatchForRecord({ ...boat, scopeType: "country", scopeId: "RU" }, catchOnOka).eligible).toBe(true);
    expect(evaluateCatchForRecord(spot, catchOnOka).eligible).toBe(false);
  });

  it("has collision-resistant keys and distinct notification event identities", () => {
    const similar = { ...spot, scopeId: 'mizin-01","fake"' };
    expect(recordCategoryKey(spot)).not.toBe(recordCategoryKey(similar));
    expect(titleChangedEventKey(spot, "catch-a")).toBe(titleChangedEventKey(spot, "catch-a"));
    expect(titleChangedEventKey(spot, "catch-a")).not.toBe(titleChangedEventKey(spot, "catch-b"));
    expect(titleChangedEventKey(similar, "catch-a")).not.toBe(titleChangedEventKey(spot, "catch-a"));
    expect(titleChangedEventKey(spot, "")).toBeNull();
  });

  it("rejects mismatched category types instead of mixing rankings", () => {
    expect(recordCategoryKey({ ...spot, league: "winter" })).toBeNull();
    expect(recordCategoryKey({ ...spot, nomination: "ul-smallest" })).toBeNull();
    expect(recordCategoryKey({ ...spot, scopeId: "" })).toBeNull();
    expect(recordCategoryKey({ ...spot, speciesId: "" })).toBeNull();
  });
});
