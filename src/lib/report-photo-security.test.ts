// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { sanitizeReportJpeg } from "../../supabase/functions/_shared/report-photo-jpeg";
import {
  createReportPhotoUploadHandler,
  type PhotoUploadDependencies,
} from "../../supabase/functions/report-photo-upload/handler";

const fixture = (name = "report-photo-with-exif.jpg") =>
  new Uint8Array(readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url)));
const owner = "00000000-0000-4000-8000-000000000001";
const report = "10000000-0000-4000-8000-000000000001";
const photo = "20000000-0000-4000-8000-000000000001";
const path = `${owner}/${report}/${photo}.jpg`;
function dependencies() {
  return {
    authorize: vi.fn<PhotoUploadDependencies["authorize"]>().mockResolvedValue(owner),
    existing: vi.fn<PhotoUploadDependencies["existing"]>().mockResolvedValue(null),
    reserve: vi.fn<PhotoUploadDependencies["reserve"]>().mockResolvedValue(undefined),
    upload: vi.fn<PhotoUploadDependencies["upload"]>().mockResolvedValue(undefined),
    register: vi.fn<PhotoUploadDependencies["register"]>().mockResolvedValue(undefined),
  };
}
function request(bytes = fixture(), type = "image/jpeg", token = "fixture-token") {
  const body = new FormData();
  body.set("report_id", report);
  body.set("photo_id", photo);
  body.set("sort_order", "0");
  body.set("file", new Blob([Uint8Array.from(bytes)], { type }), "PRIVATE_GPS_FILENAME.jpg");
  return new Request("https://fixture.invalid/upload", {
    method: "POST",
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("Strict JPEG metadata boundary (real synthetic image fixtures)", () => {
  it.each(["report-photo-with-exif.jpg", "report-photo-progressive.jpg"])(
    "strips EXIF GPS and orientation from %s while retaining JPEG coding data",
    (name) => {
      const source = fixture(name);
      expect(Buffer.from(source).includes(Buffer.from("Exif\0\0"))).toBe(true);
      expect(Buffer.from(source).includes(Buffer.from("ZAPRUDA_QA_SYNTHETIC_GPS"))).toBe(true);
      const clean = sanitizeReportJpeg(source);
      expect(clean.slice(0, 2)).toEqual(new Uint8Array([255, 216]));
      expect(clean.slice(-2)).toEqual(new Uint8Array([255, 217]));
      expect(Buffer.from(clean).includes(Buffer.from("Exif\0\0"))).toBe(false);
      expect(Buffer.from(clean).includes(Buffer.from("ZAPRUDA_QA_SYNTHETIC_GPS"))).toBe(false);
      expect(sanitizeReportJpeg(clean)).toEqual(clean);
    },
  );
  it("removes APP/XMP/comments and arbitrary trailing payload", () => {
    const clean = sanitizeReportJpeg(fixture());
    const payload = Buffer.from("PRIVATE_XMP_GPS");
    const segment = (marker: number) =>
      Buffer.concat([Buffer.from([255, marker, 0, payload.length + 2]), payload]);
    const decorated = Buffer.concat([
      clean.slice(0, 2),
      segment(0xe1),
      segment(0xe2),
      segment(0xfe),
      clean.slice(2),
      payload,
    ]);
    expect(sanitizeReportJpeg(decorated)).toEqual(clean);
  });
  it.each([
    new Uint8Array(),
    new Uint8Array([137, 80, 78, 71]),
    new Uint8Array([255, 216, 255, 217]),
  ])("rejects a non-image or missing image frame", (bytes) =>
    expect(() => sanitizeReportJpeg(bytes)).toThrow(),
  );
  it("rejects truncation and corrupt segment lengths", () => {
    expect(() => sanitizeReportJpeg(fixture().slice(0, -2))).toThrow();
    expect(() => sanitizeReportJpeg(new Uint8Array([255, 216, 255, 225, 255, 255]))).toThrow();
  });
  it("rejects unknown coding markers rather than preserving opaque payload", () => {
    const bytes = Buffer.concat([Buffer.from([255, 216, 255, 0xf0, 0, 3, 0]), fixture().slice(2)]);
    expect(() => sanitizeReportJpeg(bytes)).toThrow();
  });
});

describe("Photo endpoint authorization and retry boundary (no hosted Auth)", () => {
  it("rejects unauthenticated calls before reading any backend data", async () => {
    const deps = dependencies();
    expect(
      (await createReportPhotoUploadHandler(deps)(request(fixture(), "image/jpeg", ""))).status,
    ).toBe(401);
    expect(deps.authorize).not.toHaveBeenCalled();
  });
  it("denies strangers before any privileged storage operation", async () => {
    const deps = dependencies();
    deps.authorize.mockResolvedValue(null);
    expect((await createReportPhotoUploadHandler(deps)(request())).status).toBe(403);
    expect(deps.existing).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
  });
  it("does not overwrite a photo ID belonging to another report", async () => {
    const deps = dependencies();
    deps.existing.mockResolvedValue({
      id: photo,
      report_id: report,
      user_id: "another-owner",
      sanitized_path: null,
    });
    expect((await createReportPhotoUploadHandler(deps)(request())).status).toBe(409);
    expect(deps.upload).not.toHaveBeenCalled();
  });
  it("does not write an object when the database cannot reserve a photo slot", async () => {
    const deps = dependencies();
    deps.reserve.mockRejectedValue(new Error("Photo limit"));
    expect((await createReportPhotoUploadHandler(deps)(request())).status).toBe(503);
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.register).not.toHaveBeenCalled();
  });
  it("stores only processed bytes under an opaque canonical path", async () => {
    const deps = dependencies();
    const response = await createReportPhotoUploadHandler(deps)(request());
    expect(response.status).toBe(200);
    expect(deps.upload).toHaveBeenCalledWith(path, sanitizeReportJpeg(fixture()));
    expect(deps.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: photo,
        user_id: owner,
        report_id: report,
        sanitized_path: path,
      }),
    );
    expect(await response.text()).not.toMatch(/PRIVATE|storage|GPS|filename/i);
  });
  it("returns the existing receipt after a lost successful response", async () => {
    const deps = dependencies();
    deps.existing.mockResolvedValue({
      id: photo,
      report_id: report,
      user_id: owner,
      sanitized_path: path,
    });
    expect((await createReportPhotoUploadHandler(deps)(request())).status).toBe(200);
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.register).not.toHaveBeenCalled();
  });
  it("rejects forged JPEG MIME without publishing bytes", async () => {
    const deps = dependencies();
    expect(
      (
        await createReportPhotoUploadHandler(deps)(
          request(new TextEncoder().encode("Exif PRIVATE GPS")),
        )
      ).status,
    ).toBe(422);
    expect(deps.upload).not.toHaveBeenCalled();
  });
  it("requires client conversion for other file formats", async () => {
    const deps = dependencies();
    expect(
      (await createReportPhotoUploadHandler(deps)(request(fixture(), "image/png"))).status,
    ).toBe(415);
    expect(deps.upload).not.toHaveBeenCalled();
  });
  it("caps the body even when Content-Length is not supplied", async () => {
    const deps = dependencies();
    // Use an attacker-controlled stream, not Undici's multipart producer (which
    // enqueues after cancellation on Node 22). The real byte limit is unchanged.
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 40000));
        controller.close();
      },
    });
    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      body,
      duplex: "half",
      headers: {
        Authorization: "Bearer fixture-token",
        "Content-Type": "multipart/form-data; boundary=fixture",
      },
    };
    const response = await createReportPhotoUploadHandler(deps)(
      new Request("https://fixture.invalid/upload", init),
    );
    expect(response.status).toBe(413);
    expect(deps.upload).not.toHaveBeenCalled();
  });
  it("redacts backend errors and safely retries the same canonical identifier", async () => {
    const deps = dependencies();
    deps.register.mockRejectedValueOnce(new Error("PRIVATE GPS backend diagnostics"));
    const handle = createReportPhotoUploadHandler(deps);
    const failed = await handle(request());
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("PRIVATE GPS");
    expect((await handle(request())).status).toBe(200);
    expect(deps.upload.mock.calls.map((call) => call[0])).toEqual([path, path]);
  });
});
