/** Real signed OWNER JWT + current STAGING xAI metadata/generation/cache proof. */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
const expected = "https://yudtbifopfnjtjanaqrd.supabase.co";
const url = process.env.ZAPRUDA_E2E_STAGING_URL;
const key = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const allowed = new Set([
  "XAI_READY_FOR_GENERATION",
  "XAI_ACCESS_UNVERIFIED",
  "XAI_INVALID_API_KEY",
  "XAI_KEY_DISABLED",
  "XAI_KEY_BLOCKED",
  "XAI_TEAM_BLOCKED",
  "XAI_ENDPOINT_DENIED",
  "XAI_MODEL_DENIED",
  "XAI_MODEL_UNAVAILABLE",
  "XAI_INSUFFICIENT_CREDITS",
  "XAI_KEY_FORMAT",
  "XAI_ENDPOINT_CONFIGURATION",
  "XAI_MODEL_CONFIGURATION",
  "XAI_ACCESS_DENIED",
  "XAI_RATE_LIMITED",
  "XAI_REQUEST_REJECTED",
  "XAI_PROVIDER_UNAVAILABLE",
  "XAI_TIMEOUT",
  "XAI_UPSTREAM_ERROR",
  "ADVICE_FAILURE_LIMIT",
  "ADVICE_IN_PROGRESS",
  "ADVICE_JOURNAL_UNAVAILABLE",
]);
const summary = {
  test: "real-JWT xAI generation and persistence",
  passed: false,
  freshGeneration: false,
};
const check = (condition, code) => {
  if (!condition) throw new Error(code);
};
let client,
  userId,
  phase = "configuration";
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
async function journal(columns) {
  const result = await client
    .from("ai_daily_advices")
    .select(columns)
    .eq("user_id", userId)
    .eq("advice_day", day)
    .maybeSingle();
  check(!result.error, "XAI_JOURNAL_ACCESS_FAILED");
  return result.data;
}
async function invoke(body) {
  const result = await client.functions.invoke("zapruda-daily-advice", {
    body,
    signal: AbortSignal.timeout(60_000),
  });
  if (!result.error) return { data: result.data, ok: true };
  let data = result.data;
  try {
    data = await result.error.context.clone().json();
  } catch {}
  return { data, ok: false };
}
try {
  check(url === expected, "XAI_STAGING_REQUIRED");
  check(
    key && (key.startsWith("sb_publishable_") || key.startsWith("eyJ")),
    "XAI_CONFIGURATION_MISSING",
  );
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  phase = "real_login";
  const signed = await client.auth.signInWithPassword({
    email: process.env.ZAPRUDA_E2E_OWNER_EMAIL ?? "",
    password: process.env.ZAPRUDA_E2E_OWNER_PASSWORD ?? "",
  });
  check(!signed.error && signed.data.session?.access_token, "XAI_LOGIN_FAILED");
  const current = await client.auth.getUser();
  check(!current.error && current.data.user?.email_confirmed_at, "XAI_CONFIRMED_USER_REQUIRED");
  userId = current.data.user.id;
  const before = await journal("status,attempts");
  phase = "read_only_diagnosis";
  const diagnostic = await invoke({ action: "diagnose" });
  const data = diagnostic.data ?? {};
  const code = allowed.has(data.code) ? data.code : "XAI_DIAGNOSTIC_UNAVAILABLE";
  summary.diagnostic = {
    code,
    stage: ["configuration", "account", "models"].includes(data.stage) ? data.stage : "unknown",
    accountHttp: Number.isInteger(data.accountHttp) ? data.accountHttp : null,
    modelsHttp: Number.isInteger(data.modelsHttp) ? data.modelsHttp : null,
    chat: ["allowed", "denied", "unknown"].includes(data.chat) ? data.chat : "unknown",
    model: ["allowed", "denied", "unknown"].includes(data.model) ? data.model : "unknown",
    quota: ["cached", "failed_limit", "in_progress", "available", "unknown"].includes(data.quota)
      ? data.quota
      : "unknown",
    keyNormalized: data.key_normalized === true,
    credits: "unverified",
  };
  const after = await journal("status,attempts");
  check(JSON.stringify(before) === JSON.stringify(after), "XAI_DIAGNOSIS_CHANGED_QUOTA");
  summary.diagnostic.quotaPreserved = true;
  console.log("xAI access:", JSON.stringify(summary.diagnostic));
  check(diagnostic.ok && data.diagnostic_only === true && data.canGenerate === true, code);
  check(data.quota !== "failed_limit", "ADVICE_FAILURE_LIMIT");
  check(data.quota !== "in_progress", "ADVICE_IN_PROGRESS");
  phase = "actual_model_request";
  const input = {
    location: "Учебный водоём, без координат",
    target: "Любой хищник",
    time: "Утро",
    notes: "Проверка STAGING: не выдумывай GPS и не обещай улов.",
  };
  const generated = await invoke(input);
  if (!generated.ok)
    throw new Error(
      allowed.has(generated.data?.code) ? generated.data.code : "XAI_LIVE_GENERATION_FAILED",
    );
  check(
    typeof generated.data?.answer === "string" && generated.data.answer.length >= 40,
    "XAI_EMPTY_MODEL_ANSWER",
  );
  summary.freshGeneration = generated.data.already_used === false;
  summary.answerCharacters = generated.data.answer.length;
  phase = "stored_answer";
  const stored = await journal("status,answer,model,attempts");
  check(
    stored?.status === "ready" &&
      stored.answer === generated.data.answer &&
      typeof stored.model === "string" &&
      stored.model.length > 0,
    "XAI_PERSISTENCE_FAILED",
  );
  summary.journalReady = true;
  phase = "cached_repeat";
  const cached = await invoke(input);
  check(
    cached.ok && cached.data?.already_used === true && cached.data.answer === generated.data.answer,
    "XAI_CACHED_QUOTA_FAILED",
  );
  const repeated = await journal("status,attempts");
  check(
    repeated?.attempts === stored.attempts && repeated.status === "ready",
    "XAI_REPEAT_CHANGED_QUOTA",
  );
  summary.cachedRepeat = true;
  summary.passed = true;
  console.log(
    "PASS: actual Grok response, owner-only ready journal, identical cached repeat; freshGeneration=" +
      summary.freshGeneration,
  );
} catch (error) {
  summary.phase = phase;
  summary.code =
    error instanceof Error && /^(XAI|ADVICE)_[A-Z_]+$/.test(error.message)
      ? error.message
      : "XAI_TRANSPORT_ERROR";
  console.error("FAIL:", summary.code, "phase=" + phase);
  process.exitCode = 1;
} finally {
  if (client) await client.auth.signOut({ scope: "local" }).catch(() => {});
  mkdirSync("qa/v075-safe", { recursive: true });
  writeFileSync("qa/v075-safe/xai.json", JSON.stringify(summary, null, 2) + "\n");
}
