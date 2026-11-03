import { describe, expect, it } from "vitest";
import { approvedMapUrl, isApprovedPublicSpot, type PublicSpot } from "./approved-spot-map";

const approved: PublicSpot = {
  id: "spot-1",
  name: "Проверенная публичная точка",
  city: "Нижний Новгород",
  region: "Нижегородская область",
  waterbody_name: "Ока",
  public_lat: 56.25,
  public_lng: 43.95,
  disciplines: ["street", "ultralight"],
  state: "approved",
  reviewed_at: "2026-11-03T12:00:00Z",
};

describe("v0.7.5 public map: no private or unapproved coordinates", () => {
  it("never embeds unpublished or not reviewed locations", () => {
    expect(approvedMapUrl([{ ...approved, state: "candidate" }])).toBeNull();
    expect(approvedMapUrl([{ ...approved, reviewed_at: null }])).toBeNull();
    expect(approvedMapUrl([{ ...approved, public_lat: null }])).toBeNull();
    expect(approvedMapUrl([{ ...approved, public_lng: null }])).toBeNull();
    expect(approvedMapUrl([])).toBeNull();
  });

  it("only passes verified public coordinates to the third party", () => {
    const privateCandidate = { ...approved, id: "secret", public_lat: 55.1234, public_lng: 39.9876, state: "candidate" };
    const url = approvedMapUrl([privateCandidate, approved]);
    expect(url).toContain("43.95%2C56.25");
    expect(url).not.toContain("39.9876");
    expect(url).not.toContain("55.1234");
  });

  it("rejects non-finite and out-of-range coordinates", () => {
    expect(isApprovedPublicSpot({ ...approved, public_lat: Infinity })).toBe(false);
    expect(isApprovedPublicSpot({ ...approved, public_lng: 182 })).toBe(false);
    expect(isApprovedPublicSpot({ ...approved, public_lat: -91 })).toBe(false);
    expect(isApprovedPublicSpot(approved)).toBe(true);
  });
});
