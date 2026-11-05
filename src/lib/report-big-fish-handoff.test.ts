import { afterEach, describe, expect, it } from "vitest";
import {
  createReportHandoff,
  readReportHandoff,
  saveReportHandoff,
} from "./report-big-fish-handoff";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const report = "10000000-0000-4000-8000-000000000001";
afterEach(() => sessionStorage.clear());
describe("explicit one-fish report handoff (not verification)", () => {
  it("converts each individual fish without summing weights or copying source metadata", () => {
    const extra = {
      species: "Щука",
      weight: "1.25",
      length: "40.5",
      latitude: 1,
      verified: true,
      photo: "private-original",
    };
    expect(
      createReportHandoff(report, [extra, { species: "Окунь", weight: "0.3", length: "" }], 1000),
    ).toEqual({
      report_id: report,
      expires_at: 1801000,
      selected: null,
      fish: [
        { species: "pike", weight_g: 1250, length_mm: 405 },
        { species: "perch", weight_g: 300, length_mm: null },
      ],
    });
  });
  it("requires an explicit valid choice and isolates the actor across reload", () => {
    const h = createReportHandoff(report, [{ species: "Щука", weight: "1", length: "40" }])!;
    saveReportHandoff(a, h);
    expect(readReportHandoff(a)?.selected).toBeNull();
    expect(readReportHandoff(b)).toBeNull();
    saveReportHandoff(a, { ...h, selected: 0 });
    expect(readReportHandoff(a)?.selected).toBe(0);
  });
  it("expires and removes the transfer instead of leaving an old private hint", () => {
    saveReportHandoff(
      a,
      createReportHandoff(report, [{ species: "pike", weight: "1", length: "40" }], 1000)!,
    );
    expect(readReportHandoff(a, 1801001)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it("strips unknown fields on read and never restores a caller's verified claim or GPS", () => {
    const h = createReportHandoff(report, [{ species: "pike", weight: "1", length: "40" }])!;
    sessionStorage.setItem(
      "zapruda:big-fish-handoff:v1:" + a,
      JSON.stringify({
        ...h,
        token: "not-transferred",
        fish: [{ ...h.fish[0], verified: true, latitude: 1, original: "private" }],
      }),
    );
    expect(JSON.stringify(readReportHandoff(a))).not.toMatch(/latitude|verified|token|original/);
  });
  it("rejects malformed IDs, invalid weights and a zero-catch outing", () => {
    expect(createReportHandoff("bad", [])).toBeNull();
    expect(createReportHandoff(report, [])).toBeNull();
    expect(
      createReportHandoff(report, [
        { species: "pike", weight: "NaN", length: "1" },
        { species: "pike", weight: "-1", length: "1" },
      ]),
    ).toBeNull();
  });
});
