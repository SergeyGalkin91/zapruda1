/**
 * Actual hosted Auth/REST/Storage HTTP proof. PRIVATE transport fixture only:
 * no public report, fish claim, approved spot, moderator or title is created.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
const expected = "https://yudtbifopfnjtjanaqrd.supabase.co";
const url = process.env.ZAPRUDA_E2E_STAGING_URL;
const key = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const marker = "SYNTHETIC_PRIVATE_METADATA_DO_NOT_PUBLISH";
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/4QC+RXhpZgAATU0AKgAAAAgAAgEOAAIAAAAqAAAAJoglAAQAAAABAAAAUAAAAABTWU5USEVUSUNfUFJJVkFURV9NRVRBREFUQV9ET19OT1RfUFVCTElTSAAABAABAAIAAAACTgAAAAACAAUAAAADAAAAhgADAAIAAAACRQAAAAAEAAUAAAADAAAAngAAAAAAAAABAAAAAQAAAAIAAAABAAAAAwAAAAEAAAAEAAAAAQAAAAUAAAABAAAABgAAAAH/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCxRRRXYcgUUUUAFFFFABRRRQB//9k=",
  "base64",
);
const summary = {
  test: "real-JWT private photo HTTP",
  publicFixtures: 0,
  passed: false,
  cleanup: false,
};
const clients = [];
let owner, ownerId, session, reportId, photoId;
let phase = "configuration";
const check = (condition, code) => {
  if (!condition) throw new Error(code);
};
const newClient = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
async function login(role) {
  const client = newClient();
  clients.push(client);
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env["ZAPRUDA_E2E_" + role + "_EMAIL"] ?? "",
    password: process.env["ZAPRUDA_E2E_" + role + "_PASSWORD"] ?? "",
  });
  check(!error && data.session?.access_token, "PHOTO_LOGIN_FAILED");
  const current = await client.auth.getUser();
  check(!current.error && current.data.user?.email_confirmed_at, "PHOTO_CONFIRMED_USER_REQUIRED");
  return { client, user: current.data.user, session: data.session };
}
const photoUrl = () => url + "/functions/v1/report-photo-access?photo_id=" + photoId;
const headers = (token) => ({ apikey: key, Authorization: "Bearer " + token });
function form() {
  const body = new FormData();
  body.set("report_id", reportId);
  body.set("photo_id", photoId);
  body.set("sort_order", "0");
  body.set("file", new Blob([jpeg], { type: "image/jpeg" }), "qa-private-transport.jpg");
  return body;
}
function privateSegments(bytes) {
  let at = 2;
  while (at + 3 < bytes.length) {
    if (bytes[at++] !== 255) return true;
    while (bytes[at] === 255) at++;
    const kind = bytes[at++];
    if (kind === 218 || kind === 217) return false;
    if ((kind >= 225 && kind <= 239) || kind === 254) return true;
    const size = bytes[at] * 256 + bytes[at + 1];
    if (size < 2 || at + size > bytes.length) return true;
    at += size;
  }
  return true;
}
try {
  check(url === expected, "PHOTO_STAGING_REQUIRED");
  check(
    key && (key.startsWith("sb_publishable_") || key.startsWith("eyJ")),
    "PHOTO_CONFIGURATION_MISSING",
  );
  phase = "real_login";
  const a = await login("RACER_A"),
    b = await login("SEATED");
  check(a.user.id !== b.user.id, "PHOTO_DISTINCT_USERS_REQUIRED");
  owner = a.client;
  ownerId = a.user.id;
  session = a.session;
  phase = "private_report";
  const created = await owner
    .from("fishing_reports")
    .insert({
      user_id: ownerId,
      title: "[QA PRIVATE] image transport " + randomUUID(),
      body: "Private transport fixture, not a catch or public fishing report.",
      is_public: false,
    })
    .select("id,is_public")
    .single();
  check(
    !created.error && created.data?.id && created.data.is_public === false,
    "PHOTO_PRIVATE_REPORT_FAILED",
  );
  reportId = created.data.id;
  photoId = randomUUID();
  phase = "owner_upload";
  const upload = await owner.functions.invoke("report-photo-upload", { body: form() });
  check(!upload.error && upload.data?.photo_id === photoId, "PHOTO_UPLOAD_FAILED");
  phase = "idempotent_upload";
  const repeated = await owner.functions.invoke("report-photo-upload", { body: form() });
  check(!repeated.error && repeated.data?.photo_id === photoId, "PHOTO_RETRY_FAILED");
  const rows = await owner
    .from("report_photos")
    .select("id,sanitized_at")
    .eq("report_id", reportId);
  check(
    !rows.error && rows.data?.length === 1 && rows.data[0].sanitized_at,
    "PHOTO_REGISTRATION_FAILED",
  );
  phase = "owner_download";
  const own = await fetch(photoUrl(), {
    headers: headers(session.access_token),
    signal: AbortSignal.timeout(30_000),
  });
  check(own.status === 200, "PHOTO_OWNER_DOWNLOAD_FAILED");
  check(own.headers.get("cache-control")?.includes("no-store"), "PHOTO_CACHE_POLICY_FAILED");
  const bytes = Buffer.from(await own.arrayBuffer());
  check(
    bytes.length > 100 && !bytes.includes(Buffer.from(marker)) && !privateSegments(bytes),
    "PHOTO_METADATA_LEAK",
  );
  phase = "guest_and_stranger";
  const guest = await fetch(photoUrl(), { signal: AbortSignal.timeout(30_000) });
  const stranger = await fetch(photoUrl(), {
    headers: headers(b.session.access_token),
    signal: AbortSignal.timeout(30_000),
  });
  check(guest.status === 404 && stranger.status === 404, "PHOTO_PRIVATE_ACCESS_LEAK");
  const wrongDelete = await fetch(photoUrl(), {
    method: "DELETE",
    headers: headers(b.session.access_token),
    signal: AbortSignal.timeout(30_000),
  });
  check(wrongDelete.status === 404, "PHOTO_STRANGER_DELETE_ALLOWED");
  phase = "direct_storage_signing";
  const path = ownerId + "/" + reportId + "/" + photoId + ".jpg";
  const direct = await owner.storage.from("report-photo-derivatives").createSignedUrl(path, 3600);
  check(Boolean(direct.error) && !direct.data?.signedUrl, "PHOTO_REUSABLE_STORAGE_TOKEN_ALLOWED");
  const outsiderRows = await b.client.from("report_photos").select("id").eq("id", photoId);
  check(!outsiderRows.error && outsiderRows.data?.length === 0, "PHOTO_METADATA_RLS_LEAK");
  phase = "exact_coordinate_acl";
  for (const client of [owner, newClient()]) {
    const exact = await client
      .from("fishing_reports")
      .select("latitude,longitude")
      .eq("id", reportId);
    check(exact.error?.code === "42501", "PHOTO_LEGACY_GPS_SELECT_ALLOWED");
  }
  summary.passed = true;
  console.log(
    "PASS: real owner JWT upload/retry/download; GPS/EXIF stripped; guest/stranger denied; direct signing and exact GPS SELECT blocked",
  );
} catch (error) {
  summary.phase = phase;
  summary.code =
    error instanceof Error && /^PHOTO_[A-Z_]+$/.test(error.message)
      ? error.message
      : "PHOTO_TRANSPORT_ERROR";
  console.error("FAIL:", summary.code, "phase=" + phase);
  process.exitCode = 1;
} finally {
  try {
    if (photoId && session) {
      const deleted = await fetch(photoUrl(), {
        method: "DELETE",
        headers: headers(session.access_token),
        signal: AbortSignal.timeout(30_000),
      });
      check([204, 404].includes(deleted.status), "PHOTO_OWNER_CLEANUP_FAILED");
    }
    if (reportId && owner) {
      const remaining = await owner.from("report_photos").select("id").eq("report_id", reportId);
      check(!remaining.error && remaining.data?.length === 0, "PHOTO_CLEANUP_METADATA_REMAINS");
      const removed = await owner
        .from("fishing_reports")
        .delete()
        .eq("id", reportId)
        .eq("user_id", ownerId)
        .select("id");
      check(!removed.error && removed.data?.length === 1, "PHOTO_CLEANUP_REPORT_FAILED");
    }
    summary.cleanup = true;
  } catch {
    summary.cleanup = false;
    console.error("FAIL: PHOTO_CLEANUP_FAILED; preserve private fixture for audited recovery");
    process.exitCode = 1;
  }
  for (const client of clients) await client.auth.signOut({ scope: "local" }).catch(() => {});
  mkdirSync("qa/v075-safe", { recursive: true });
  writeFileSync("qa/v075-safe/private-photo.json", JSON.stringify(summary, null, 2) + "\n");
}
