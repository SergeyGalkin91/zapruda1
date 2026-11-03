/**
 * v0.7.5 SPOT protected live JWT preflight.
 * Read-only: never creates catches, moderators, locations or public champions.
 * All four accounts must have CONFIRMED email and distinct Auth user IDs.
 *
 * Usage: node scripts/e2e/spot-v075-live.mjs
 * Environment credentials belong ONLY to GitHub's staging-e2e environment.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_URL = "https://yudtbifopfnjtjanaqrd.supabase.co";
const URL = process.env.ZAPRUDA_E2E_STAGING_URL;
const KEY = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const API = "zapruda-spot-records";

function required(name) {
  const value = process.env[name];
  assert.ok(value && value.trim(), "Missing protected environment value: " + name);
  return value;
}

function newClient() {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function invoke(client, action, body = {}) {
  const { data, error } = await client.functions.invoke(API, {
    body: { action, ...body },
  });
  return { data, error };
}

/** Valid synthetic PNG: tests transport only, NEVER accepted as real fish proof. */
function pngChunk(type, content) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(content.length);
  const payload = Buffer.concat([name, content]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, payload, checksum]);
}

function syntheticPng() {
  const size = 32;
  const info = Buffer.alloc(13);
  info.writeUInt32BE(size, 0);
  info.writeUInt32BE(size, 4);
  info[8] = 8; // bit depth
  info[9] = 2; // RGB
  const rows = Buffer.alloc(size * (1 + size * 3));
  for (let row = 0; row < size; row += 1) {
    randomBytes(size * 3).copy(rows, row * (1 + size * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", info),
    pngChunk("IDAT", deflateSync(rows)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function negativeUploadProbe(client) {
  const before = await invoke(client, "mine");
  assert.ifError(before.error);
  const beforeIds = (before.data?.catches ?? []).map((item) => item.catch_id).sort();
  const form = new FormData();
  form.set("action", "submit");
  form.set("photo", new Blob([syntheticPng()], { type: "image/png" }), "qa-not-a-fish.png");
  form.set("spot_id", randomUUID()); // deliberately unapproved: MUST reject
  form.set("league", "street");
  form.set("species", "pike");
  form.set("weight_g", "1000");
  form.set("length_mm", "250");
  form.set("captured_at", new Date().toISOString());
  const { data, error } = await client.functions.invoke(API, { body: form });
  assert.ok(error || data?.error, "Unapproved spot received a catch");
  const rejected = error?.context && typeof error.context.json === "function"
    ? await error.context.json().catch(() => null)
    : data;
  assert.equal(rejected?.error, "Record submission rejected", "Wrong negative-upload rejection");
  const after = await invoke(client, "mine");
  assert.ifError(after.error);
  const afterIds = (after.data?.catches ?? []).map((item) => item.catch_id).sort();
  assert.deepEqual(afterIds, beforeIds, "Rejected upload persisted a catch");
  console.log("PASS: signed multipart upload rejected for unapproved spot; no catch stored");
}

async function main() {
  assert.equal(URL, EXPECTED_URL, "STAGING project mismatch — refusing to run");
  assert.ok(KEY?.startsWith("sb_publishable_") || KEY?.startsWith("eyJ"), "Use a STAGING publishable/anon key");

  const roles = ["OWNER", "SEATED", "RACER_A", "RACER_B"];
  const users = new Map();
  const identities = new Set();

  for (const role of roles) {
    const email = required("ZAPRUDA_E2E_" + role + "_EMAIL");
    const password = required("ZAPRUDA_E2E_" + role + "_PASSWORD");
    const client = newClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    assert.ifError(error);
    assert.ok(data?.user?.id && data?.session?.access_token, "Missing signed user session for " + role);
    const { data: detail, error: userError } = await client.auth.getUser();
    assert.ifError(userError);
    assert.ok(detail.user?.email_confirmed_at, "Email confirmation missing for " + role);
    assert.ok(!identities.has(detail.user.id), "Test roles MUST be distinct");
    identities.add(detail.user.id);
    users.set(role, client);
    console.log("PASS: confirmed signed JWT for " + role);
  }

  // The Edge function requires a real JWT and must enforce moderator-only reads.
  for (const role of ["SEATED", "RACER_A", "RACER_B"]) {
    const { data, error } = await invoke(users.get(role), "queue");
    assert.ok(error || data?.error, "Non-moderator may read review queue: " + role);
    console.log("PASS: moderation queue access denied for " + role);
  }

  for (const role of roles) {
    const client = users.get(role);
    const own = await invoke(client, "mine");
    assert.ifError(own.error);
    assert.ok(Array.isArray(own.data?.catches), "Mine endpoint must return an array");
    const inbox = await invoke(client, "inbox");
    assert.ifError(inbox.error);
    assert.ok(Array.isArray(inbox.data?.notifications), "Inbox must return an array");
    console.log("PASS: own catches + own inbox for " + role);
  }

  if (process.env.ZAPRUDA_SPOT_E2E_UPLOAD_PROBE === "true") {
    await negativeUploadProbe(users.get("RACER_A"));
  }

  const ownerQueue = await invoke(users.get("OWNER"), "queue");
  if (process.env.ZAPRUDA_SPOT_E2E_REQUIRE_MODERATOR === "true") {
    assert.ifError(ownerQueue.error);
    assert.ok(Array.isArray(ownerQueue.data?.queue), "OWNER must be appointed as SPOT moderator");
    console.log("PASS: owner is appointed SPOT moderator");
  } else {
    console.log("INFO: moderator appointment not asserted; set ZAPRUDA_SPOT_E2E_REQUIRE_MODERATOR=true after authorization");
  }

  for (const client of users.values()) {
    await client.auth.signOut();
  }
  console.log("SPOT v0.7.5 JWT PREFLIGHT PASS; no records or spots were created.");
}

main().catch((error) => {
  // Errors are deliberately terse: never print token, email or response payload.
  console.error("SPOT JWT preflight FAIL:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
