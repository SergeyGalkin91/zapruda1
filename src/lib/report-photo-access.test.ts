import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReportPhotoAccessHandler } from "../../supabase/functions/report-photo-access/handler";

const photo = "20000000-0000-4000-8000-000000000001";
const path = `10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000002/${photo}.jpg`;
const jpeg = Uint8Array.from([255, 216, 255, 217]);
const deps = {
  resolve: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
};
const request = (method = "GET", authorization?: string, id = photo) =>
  new Request(`https://disconnected.invalid/report-photo-access?photo_id=${id}`, {
    method,
    ...(authorization ? { headers: { authorization } } : {}),
  });
beforeEach(() => {
  vi.clearAllMocks();
  deps.resolve.mockResolvedValue({ path, owner: false, ready: true });
  deps.download.mockResolvedValue(jpeg);
  deps.remove.mockResolvedValue(undefined);
});
describe("Photo visibility gateway (offline handler regressions, not live JWT E2E)", () => {
  it("serves only the authorized derivative with no-cache and no reusable Storage token", async () => {
    const response = await createReportPhotoAccessHandler(deps)(request());
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(jpeg);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Location")).toBeNull();
    expect(deps.resolve).toHaveBeenCalledTimes(2);
    expect(deps.resolve).toHaveBeenCalledWith(photo, null);
    expect(deps.download).toHaveBeenCalledWith(path);
  });
  it("does not read Storage for an invisible or unsanitized photo", async () => {
    deps.resolve.mockResolvedValue(null);
    expect((await createReportPhotoAccessHandler(deps)(request())).status).toBe(404);
    expect(deps.download).not.toHaveBeenCalled();
  });
  it("honors a public-to-private transition while Storage was being read", async () => {
    deps.resolve
      .mockResolvedValueOnce({ path, owner: false, ready: true })
      .mockResolvedValueOnce(null);
    expect((await createReportPhotoAccessHandler(deps)(request())).status).toBe(404);
  });
  it("does not serve stale bytes after the canonical photo path changes", async () => {
    deps.resolve.mockResolvedValueOnce({ path, owner: false, ready: true });
    deps.resolve.mockResolvedValueOnce({
      path: path.replace("10000000", "30000000"),
      owner: false,
      ready: true,
    });
    expect((await createReportPhotoAccessHandler(deps)(request())).status).toBe(404);
  });
  it.each(["../original.jpg", `other/${photo}.jpg`, `${path}/extra`])(
    "rejects non-canonical trusted metadata %s",
    async (value) => {
      deps.resolve.mockResolvedValue({ path: value, owner: true, ready: true });
      expect((await createReportPhotoAccessHandler(deps)(request())).status).toBe(404);
      expect(deps.download).not.toHaveBeenCalled();
    },
  );
  it("requires a JWT to delete even public derivatives", async () => {
    expect((await createReportPhotoAccessHandler(deps)(request("DELETE"))).status).toBe(401);
    expect(deps.resolve).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });
  it("does not allow a non-owner with a JWT to delete a public photo", async () => {
    expect(
      (await createReportPhotoAccessHandler(deps)(request("DELETE", "Bearer offline-fixture")))
        .status,
    ).toBe(404);
    expect(deps.remove).not.toHaveBeenCalled();
  });
  it("allows an authorized owner to delete only their resolved photo", async () => {
    deps.resolve.mockResolvedValue({ path, owner: true, ready: true });
    expect(
      (await createReportPhotoAccessHandler(deps)(request("DELETE", "Bearer offline-fixture")))
        .status,
    ).toBe(204);
    expect(deps.remove).toHaveBeenCalledWith(photo, path);
    expect(deps.download).not.toHaveBeenCalled();
  });
  it("does not disclose private backend errors", async () => {
    deps.download.mockRejectedValue(new Error("PRIVATE_STORAGE_PATH_AND_METADATA"));
    const response = await createReportPhotoAccessHandler(deps)(request());
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });
  it("lets the owner clean up a failed private reservation without making it readable", async () => {
    deps.resolve.mockResolvedValue({ path, owner: true, ready: false });
    const handler = createReportPhotoAccessHandler(deps);
    expect((await handler(request("GET", "Bearer offline-fixture"))).status).toBe(404);
    expect(deps.download).not.toHaveBeenCalled();
    expect((await handler(request("DELETE", "Bearer offline-fixture"))).status).toBe(204);
    expect(deps.remove).toHaveBeenCalledWith(photo, path);
  });
  it("rejects an invalid image instead of serving arbitrary bytes", async () => {
    deps.download.mockResolvedValue(new TextEncoder().encode("<script>PRIVATE</script>"));
    expect((await createReportPhotoAccessHandler(deps)(request())).status).toBe(503);
  });
  it("rejects malformed authorization, IDs and unsupported methods before Storage work", async () => {
    const handler = createReportPhotoAccessHandler(deps);
    expect((await handler(request("GET", "Basic bad"))).status).toBe(401);
    expect((await handler(request("GET", undefined, "../bad"))).status).toBe(400);
    expect((await handler(request("POST"))).status).toBe(405);
    expect(deps.resolve).not.toHaveBeenCalled();
  });
});
