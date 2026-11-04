/** Actual confirmed JWT/REST/Storage. Private catch fixtures; NO public fish,
 * moderator, approved spot, quota reset, or privileged key. Owned records cleaned. */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { jpeg, marker } from "./pilot-photo-fixture.mjs";
const url = process.env.ZAPRUDA_E2E_STAGING_URL;
const key = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const summary = {
  test: "pilot-schema real confirmed JWT",
  passed: false,
  cleanup: false,
  publicCatchFixtures: 0,
  checks: [],
};
const accounts = [],
  reports = [],
  kits = [],
  gear = [];
let owner,
  stranger,
  privateReport,
  mediaReport,
  reportPhoto,
  message,
  chatPhoto,
  mark,
  originalPrimary,
  addedPreferences = false;
let phase = "configuration";
const requireThat = (condition, code) => {
  if (!condition) throw new Error(code);
};
const passed = (name) => {
  summary.checks.push(name);
};
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }),
    },
  });
const headers = (token) => ({
  apikey: key,
  ...(token ? { Authorization: "Bearer " + token } : {}),
});
const photoEndpoint = (kind, id) =>
  url + "/functions/v1/" + kind + "?photo_id=" + encodeURIComponent(id);
async function login(role) {
  const api = client();
  accounts.push(api);
  const result = await api.auth.signInWithPassword({
    email: process.env[`ZAPRUDA_E2E_${role}_EMAIL`] ?? "",
    password: process.env[`ZAPRUDA_E2E_${role}_PASSWORD`] ?? "",
  });
  requireThat(!result.error && result.data.session?.access_token, "PILOT_LOGIN_FAILED");
  const current = await api.auth.getUser();
  requireThat(
    !current.error && current.data.user?.email_confirmed_at && !current.data.user.is_anonymous,
    "PILOT_CONFIRMED_USER_REQUIRED",
  );
  return { api, id: current.data.user.id, token: result.data.session.access_token };
}
async function must(result, code) {
  requireThat(!result.error, code);
  return result.data;
}
async function noRows(api, table, field, id) {
  const result = await api.from(table).select("id").eq(field, id);
  requireThat(!result.error && result.data.length === 0, "PILOT_PRIVATE_ROW_EXPOSED");
}
function form(parent, id) {
  const body = new FormData();
  body.set("report_id", parent);
  body.set("photo_id", id);
  body.set("sort_order", "0");
  body.set("file", new Blob([jpeg], { type: "image/jpeg" }), "qa-transport.jpg");
  return body;
}
async function upload(kind, parent, id) {
  const response = await fetch(url + "/functions/v1/" + kind, {
    method: "POST",
    headers: headers(owner.token),
    body: form(parent, id),
    signal: AbortSignal.timeout(30000),
  });
  const value = await response.json().catch(() => ({}));
  requireThat(response.status === 200 && value.photo_id === id, "PILOT_PHOTO_UPLOAD_FAILED");
}
async function photoStatus(kind, id, token) {
  return fetch(photoEndpoint(kind, id), {
    headers: headers(token),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
}
async function safeImage(response) {
  requireThat(response.status === 200, "PILOT_PHOTO_READ_FAILED");
  const bytes = Buffer.from(await response.arrayBuffer());
  requireThat(
    !bytes.includes(Buffer.from(marker)) && !bytes.includes(Buffer.from("Exif")),
    "PILOT_IMAGE_METADATA_LEAK",
  );
  requireThat(
    response.headers.get("cache-control")?.includes("no-store"),
    "PILOT_PHOTO_CACHE_LEAK",
  );
}
try {
  requireThat(url === "https://yudtbifopfnjtjanaqrd.supabase.co", "PILOT_STAGING_REQUIRED");
  requireThat(
    key && (key.startsWith("sb_publishable_") || key.startsWith("eyJ")),
    "PILOT_PUBLIC_CONFIGURATION_REQUIRED",
  );
  phase = "real_login";
  const signed = await Promise.all(["OWNER", "SEATED", "RACER_A", "RACER_B"].map(login));
  requireThat(new Set(signed.map((a) => a.id)).size === 4, "PILOT_DISTINCT_USERS_REQUIRED");
  owner = signed[2];
  stranger = signed[1];
  const guest = client();
  accounts.push(guest);
  passed("four-confirmed-distinct-real-JWTs");
  phase = "atomic_private_report";
  privateReport = randomUUID();
  reports.push(privateReport);
  const request = {
    p_report_id: privateReport,
    p_report: {
      title: "[QA PRIVATE] atomic transport " + randomUUID(),
      body: "Private technical fixture; not a verified catch.",
      is_public: false,
      fishing_method: "Спиннинг",
    },
    p_catches: [{ species: "[QA private fixture]", weight_kg: 0.001, length_cm: 1 }],
  };
  const attempts = await Promise.all([
    owner.api.rpc("publish_report_with_catches", request),
    owner.api.rpc("publish_report_with_catches", request),
  ]);
  requireThat(
    attempts.every((r) => !r.error && r.data === privateReport),
    "PILOT_ATOMIC_RETRY_FAILED",
  );
  const catches = await must(
    await owner.api.from("catches").select("id").eq("report_id", privateReport),
    "PILOT_CATCH_READ_FAILED",
  );
  requireThat(catches.length === 1, "PILOT_DUPLICATE_CATCH");
  await noRows(stranger.api, "fishing_reports", "id", privateReport);
  await noRows(stranger.api, "catches", "report_id", privateReport);
  const failedId = randomUUID();
  reports.push(failedId);
  const failed = await owner.api.rpc("publish_report_with_catches", {
    ...request,
    p_report_id: failedId,
    p_catches: [{ species: "[QA invalid fixture]", weight_kg: -1 }],
  });
  requireThat(failed.error, "PILOT_INVALID_CATCH_ACCEPTED");
  await noRows(owner.api, "fishing_reports", "id", failedId);
  await noRows(owner.api, "catches", "report_id", failedId);
  const forged = await stranger.api
    .from("catches")
    .insert({ report_id: privateReport, user_id: stranger.id, species: "[QA rejected fixture]" });
  requireThat(forged.error, "PILOT_FOREIGN_CATCH_ACCEPTED");
  passed("atomic-catch-failure-rollback-retry-and-owner-boundary");
  phase = "report_photo_visibility";
  // Clearly marked, temporary no-fish privacy fixture. Never a public catch claim.
  const media = await must(
    await owner.api
      .from("fishing_reports")
      .insert({
        user_id: owner.id,
        title: "[QA TRANSPORT] privacy check, no fishing claim",
        body: "Temporary technical image-access fixture. No fish, place or trophy claim.",
        is_public: true,
      })
      .select("id")
      .single(),
    "PILOT_MEDIA_REPORT_FAILED",
  );
  mediaReport = media.id;
  reports.push(mediaReport);
  reportPhoto = randomUUID();
  const comment = await stranger.api.from("comments").insert({
    report_id: mediaReport,
    user_id: stranger.id,
    body: "[QA temporary] comment transport",
  });
  requireThat(!comment.error, "PILOT_COMMENT_CREATE_FAILED");
  await upload("report-photo-upload", mediaReport, reportPhoto);
  await safeImage(await photoStatus("report-photo-access", reportPhoto));
  await safeImage(await photoStatus("report-photo-access", reportPhoto, stranger.token));
  const hidden = await owner.api
    .from("fishing_reports")
    .update({ is_public: false })
    .eq("id", mediaReport)
    .select("id")
    .single();
  requireThat(!hidden.error, "PILOT_VISIBILITY_UPDATE_FAILED");
  requireThat(
    (await photoStatus("report-photo-access", reportPhoto)).status === 404,
    "PILOT_GUEST_PHOTO_NOT_REVOKED",
  );
  requireThat(
    (await photoStatus("report-photo-access", reportPhoto, stranger.token)).status === 404,
    "PILOT_STRANGER_PHOTO_NOT_REVOKED",
  );
  await safeImage(await photoStatus("report-photo-access", reportPhoto, owner.token));
  await noRows(stranger.api, "comments", "report_id", mediaReport);
  const sign = await owner.api.storage
    .from("report-photo-derivatives")
    .createSignedUrl(`${owner.id}/${mediaReport}/${reportPhoto}.jpg`, 60);
  requireThat(sign.error && !sign.data?.signedUrl, "PILOT_DIRECT_REPORT_SIGNING_ALLOWED");
  passed("public-to-private-HTTP-revocation-metadata-comments-no-direct-signing");
  phase = "geographic_chat";
  let prefs = await must(
    await owner.api
      .from("angler_preferences")
      .select("home_country_code")
      .eq("user_id", owner.id)
      .maybeSingle(),
    "PILOT_PREFERENCES_READ_FAILED",
  );
  if (!prefs) {
    await must(
      await owner.api
        .from("angler_preferences")
        .insert({ user_id: owner.id, home_country_code: "RU" }),
      "PILOT_QA_PREFERENCES_FAILED",
    );
    addedPreferences = true;
    prefs = { home_country_code: "RU" };
  }
  const place = await must(
    await owner.api
      .from("chat_places")
      .select("id")
      .eq("country_code", prefs.home_country_code)
      .eq("level", "country")
      .single(),
    "PILOT_HOME_COUNTRY_REQUIRED",
  );
  const sent = await must(
    await owner.api
      .from("chat_messages")
      .insert({
        user_id: owner.id,
        place_id: place.id,
        topic: "general",
        body: "[QA temporary] message/photo transport; not a fishing report",
      })
      .select("id")
      .single(),
    "PILOT_CHAT_SEND_FAILED",
  );
  message = sent.id;
  const reaction = await stranger.api
    .from("chat_message_reactions")
    .insert({ message_id: message, user_id: stranger.id, emoji: "👍" });
  requireThat(!reaction.error, "PILOT_CHAT_REACTION_FAILED");
  const spoof = await stranger.api
    .from("chat_messages")
    .insert({ user_id: owner.id, place_id: place.id, body: "[QA rejected spoof]" });
  requireThat(spoof.error, "PILOT_CHAT_SPOOF_ACCEPTED");
  const rawId = randomUUID();
  const rawPath = `${owner.id}/${message}/${rawId}.jpg`;
  chatPhoto = rawId;
  const raw = await owner.api.from("chat_message_photos").insert({
    id: rawId,
    message_id: message,
    user_id: owner.id,
    storage_path: rawPath,
    sanitized_path: rawPath,
    sanitized_at: new Date().toISOString(),
  });
  requireThat(raw.error, "PILOT_RAW_PHOTO_REGISTRATION_ALLOWED");
  chatPhoto = randomUUID();
  await upload("chat-photo-upload", message, chatPhoto);
  await upload("chat-photo-upload", message, chatPhoto);
  await safeImage(await photoStatus("chat-photo-access", chatPhoto, owner.token));
  // This is a public signed-in chat: another confirmed participant CAN view it.
  await safeImage(await photoStatus("chat-photo-access", chatPhoto, stranger.token));
  requireThat(
    (await photoStatus("chat-photo-access", chatPhoto)).status === 401,
    "PILOT_GUEST_CHAT_PHOTO_ALLOWED",
  );
  const direct = await owner.api.storage
    .from("chat-photos")
    .createSignedUrl(`${owner.id}/${message}/${chatPhoto}.jpg`, 60);
  requireThat(direct.error && !direct.data?.signedUrl, "PILOT_DIRECT_CHAT_SIGNING_ALLOWED");
  const wrongDelete = await fetch(photoEndpoint("chat-photo-access", chatPhoto), {
    method: "DELETE",
    headers: headers(stranger.token),
  });
  requireThat(wrongDelete.status === 404, "PILOT_STRANGER_CHAT_DELETE_ALLOWED");
  passed("real-chat-send-reaction-sanitized-photo-retry-and-Storage-boundary");
  phase = "private_gear_marks_profile";
  const previous = await must(
    await owner.api.from("angler_gear_sets").select("id").eq("is_primary", true).maybeSingle(),
    "PILOT_PRIMARY_SNAPSHOT_FAILED",
  );
  originalPrimary = previous?.id;
  const items = await must(
    await owner.api
      .from("angler_gear")
      .insert(
        ["rod", "reel"].map((gear_type) => ({
          user_id: owner.id,
          gear_type,
          brand: "QA temporary",
          model: "QA transport",
        })),
      )
      .select("id,gear_type"),
    "PILOT_GEAR_CREATE_FAILED",
  );
  gear.push(...items.map((r) => r.id));
  const rod = items.find((g) => g.gear_type === "rod").id,
    reel = items.find((g) => g.gear_type === "reel").id;
  const createdKits = await must(
    await owner.api
      .from("angler_gear_sets")
      .insert(
        [1, 2].map((n) => ({
          user_id: owner.id,
          rod_id: rod,
          reel_id: reel,
          title: "QA temporary " + n,
        })),
      )
      .select("id"),
    "PILOT_KIT_CREATE_FAILED",
  );
  kits.push(...createdKits.map((k) => k.id));
  const primaries = await Promise.all(
    kits.map((p_kit_id) => owner.api.rpc("set_my_primary_gear_set", { p_kit_id })),
  );
  requireThat(
    primaries.every((r) => !r.error),
    "PILOT_PRIMARY_KIT_RACE_FAILED",
  );
  const kitRows = await must(
    await owner.api.from("angler_gear_sets").select("id,is_primary").in("id", kits),
    "PILOT_KIT_READ_FAILED",
  );
  requireThat(kitRows.filter((k) => k.is_primary).length === 1, "PILOT_MULTIPLE_PRIMARY_KITS");
  await noRows(stranger.api, "angler_gear", "id", rod);
  requireThat(
    (await stranger.api.rpc("set_my_primary_gear_set", { p_kit_id: kits[0] })).error,
    "PILOT_FOREIGN_PRIMARY_KIT_ALLOWED",
  );
  const privateMark = await must(
    await owner.api
      .from("private_fishing_marks")
      .insert({
        user_id: owner.id,
        kind: "other",
        title: "QA private transport",
        note: "Temporary synthetic coordinate, not a fishing spot",
        latitude: 0,
        longitude: 0,
      })
      .select("id")
      .single(),
    "PILOT_MARK_CREATE_FAILED",
  );
  mark = privateMark.id;
  await noRows(stranger.api, "private_fishing_marks", "id", mark);
  requireThat(
    (await guest.from("private_fishing_marks").select("id")).error,
    "PILOT_GUEST_MARK_ACCESS_ALLOWED",
  );
  const profile = await must(await owner.api.rpc("my_profile_full"), "PILOT_PROFILE_READ_FAILED");
  requireThat(profile.length === 1 && profile[0].id === owner.id, "PILOT_PROFILE_OWNER_MISMATCH");
  passed("private-marks-gear-primary-concurrency-and-own-profile");
  summary.passed = true;
} catch (error) {
  summary.failedPhase = phase;
  summary.errorCode =
    error instanceof Error && /^PILOT_[A-Z_]+$/.test(error.message)
      ? error.message
      : "PILOT_UNEXPECTED_ERROR";
  process.exitCode = 1;
} finally {
  try {
    if (owner) {
      for (const [kind, id] of [
        ["chat-photo-access", chatPhoto],
        ["report-photo-access", reportPhoto],
      ])
        if (id) {
          const removed = await fetch(photoEndpoint(kind, id), {
            method: "DELETE",
            headers: headers(owner.token),
            signal: AbortSignal.timeout(30000),
          });
          requireThat([204, 404].includes(removed.status), "PILOT_PHOTO_CLEANUP_FAILED");
        }
      if (message)
        await must(
          await owner.api.from("chat_messages").delete().eq("id", message),
          "PILOT_CHAT_CLEANUP_FAILED",
        );
      if (mark)
        await must(
          await owner.api.from("private_fishing_marks").delete().eq("id", mark),
          "PILOT_MARK_CLEANUP_FAILED",
        );
      if (kits.length)
        await must(
          await owner.api.from("angler_gear_sets").delete().in("id", kits),
          "PILOT_KIT_CLEANUP_FAILED",
        );
      if (originalPrimary) {
        const current = await must(
          await owner.api
            .from("angler_gear_sets")
            .select("id")
            .eq("is_primary", true)
            .maybeSingle(),
          "PILOT_PRIMARY_RESTORE_CHECK_FAILED",
        );
        if (!current)
          await must(
            await owner.api.rpc("set_my_primary_gear_set", { p_kit_id: originalPrimary }),
            "PILOT_PRIMARY_RESTORE_FAILED",
          );
      }
      if (gear.length)
        await must(
          await owner.api.from("angler_gear").delete().in("id", gear),
          "PILOT_GEAR_CLEANUP_FAILED",
        );
      if (reports.length)
        await must(
          await owner.api.from("fishing_reports").delete().in("id", reports),
          "PILOT_REPORT_CLEANUP_FAILED",
        );
      for (const id of reports) await noRows(owner.api, "fishing_reports", "id", id);
      if (addedPreferences)
        await must(
          await owner.api.from("angler_preferences").delete().eq("user_id", owner.id),
          "PILOT_PREFERENCES_CLEANUP_FAILED",
        );
    }
    summary.cleanup = true;
  } catch {
    summary.cleanup = false;
    process.exitCode = 1;
  }
  await Promise.allSettled(accounts.map((api) => api.auth.signOut({ scope: "local" })));
  mkdirSync("qa/pilot-safe", { recursive: true });
  writeFileSync("qa/pilot-safe/result.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
}
