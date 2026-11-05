import { beforeEach, describe, expect, it, vi } from "vitest";
const backend = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), not: vi.fn(), in: vi.fn(), order: vi.fn() };
  const publicUrl = vi.fn();
  return { query, publicUrl, from: vi.fn(), bucket: vi.fn() };
});
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: backend.from,
    storage: { from: backend.bucket },
  },
}));
import { loadPublicReportPhotos } from "./public-report-photos";
beforeEach(() => {
  vi.clearAllMocks();
  backend.from.mockReturnValue(backend.query);
  for (const key of ["select", "eq", "not", "in"] as const)
    backend.query[key].mockReturnValue(backend.query);
  backend.query.order.mockResolvedValue({ data: [], error: null });
  backend.bucket.mockReturnValue({ getPublicUrl: backend.publicUrl });
  backend.publicUrl.mockReturnValue({
    data: {
      publicUrl: "https://fixture.invalid/storage/v1/object/public/report-photo-derivatives/",
    },
  });
});
describe("Public gallery visibility gateway", () => {
  it("uses a fresh-visibility endpoint without an original path or bearer token", async () => {
    backend.query.order.mockResolvedValue({
      data: [{ id: "photo", report_id: "report", sanitized_path: "opaque.jpg" }],
      error: null,
    });
    expect(await loadPublicReportPhotos(["report"])).toEqual({
      report: ["https://fixture.invalid/functions/v1/report-photo-access?photo_id=photo"],
    });
    expect(backend.query.eq).toHaveBeenCalledWith("fishing_reports.is_public", true);
    expect(backend.query.not).toHaveBeenCalledWith("sanitized_path", "is", null);
    expect(backend.bucket).toHaveBeenCalledWith("report-photo-derivatives");
    expect(backend.publicUrl).toHaveBeenCalledWith("");
  });
  it("does not issue a fresh URL once the public record disappears", async () => {
    backend.query.order.mockResolvedValue({ data: [], error: null });
    expect(await loadPublicReportPhotos(["now-private"])).toEqual({});
    expect(backend.publicUrl).not.toHaveBeenCalled();
  });
  it("does not fall back to a legacy original when migration/query fails", async () => {
    backend.query.order.mockResolvedValue({ data: null, error: { message: "column missing" } });
    await expect(loadPublicReportPhotos(["report"])).rejects.toThrow("Photographs unavailable");
    expect(backend.publicUrl).not.toHaveBeenCalled();
  });
});
