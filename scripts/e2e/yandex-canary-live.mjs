/** Real signed test accounts and hosted Yandex canary. Never print credentials or answers. */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
const url = process.env.ZAPRUDA_E2E_STAGING_URL;
const key = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
assert.equal(url, "https://yudtbifopfnjtjanaqrd.supabase.co");
assert.ok(key);
const functionName = "zapruda-daily-advice-yandex";
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const clients = [];
const summary = {
  test: "Yandex canary real JWT and real upstream",
  primary: {},
  fallback: {},
  weather: {},
  passed: false,
};
const safeCode = (code) =>
  typeof code === "string" && /^(YANDEX|ADVICE)_[A-Z_]{1,60}$/.test(code)
    ? code
    : "YANDEX_CANARY_FAILED";
async function login(role) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const auth = await client.auth.signInWithPassword({
    email: process.env[`ZAPRUDA_E2E_${role}_EMAIL`] ?? "",
    password: process.env[`ZAPRUDA_E2E_${role}_PASSWORD`] ?? "",
  });
  assert.ok(!auth.error && auth.data.session?.access_token, "YANDEX_LOGIN_FAILED");
  const verified = await client.auth.getUser();
  assert.ok(
    !verified.error && verified.data.user?.email_confirmed_at && !verified.data.user.is_anonymous,
    "YANDEX_CONFIRMED_USER_REQUIRED",
  );
  return { client, id: verified.data.user.id };
}
async function invoke(client, body) {
  const result = await client.functions.invoke(functionName, {
    body,
    signal: AbortSignal.timeout(65000),
  });
  if (!result.error) return { ok: true, status: 200, data: result.data };
  let data = null;
  try {
    data = await result.error.context.clone().json();
  } catch {}
  return { ok: false, status: result.error.context?.status ?? 0, data };
}
async function journal(account, fields = "status,attempts") {
  const result = await account.client
    .from("ai_daily_advices")
    .select(fields)
    .eq("user_id", account.id)
    .eq("advice_day", day)
    .maybeSingle();
  assert.ok(!result.error, "YANDEX_JOURNAL_READ_FAILED");
  return result.data;
}
async function verify(account, mode, expectedModel, output) {
  let phase = "diagnose";
  try {
    const before = await journal(account);
    const diagnostic = await invoke(account.client, { action: "diagnose" });
    const after = await journal(account);
    assert.deepEqual(after, before, "YANDEX_DIAGNOSE_CHANGED_QUOTA");
    output.diagnosticOnly = diagnostic.data?.diagnostic_only === true;
    output.configuration =
      diagnostic.data?.configuration === "ready"
        ? "ready"
        : safeCode(diagnostic.data?.configuration);
    output.quotaPreserved = true;
    assert.ok(diagnostic.ok && output.diagnosticOnly, "YANDEX_DIAGNOSE_FAILED");
    if (output.configuration !== "ready") throw new Error(output.configuration);
    assert.equal(diagnostic.data.approved_models_configured, true, "YANDEX_MODEL_CONFIGURATION");
    assert.equal(diagnostic.data.web_search_enabled, false, "YANDEX_SEARCH_MUST_REMAIN_OFF");
    assert.equal(diagnostic.data.quota, "available", "YANDEX_TEST_QUOTA_NOT_AVAILABLE");
    phase = "real_model_and_concurrent_quota";
    const body = {
      ...(mode === "fallback" ? { action: "verify_fallback" } : {}),
      location: "Учебный водоём без координат",
      target: "Любой хищник",
      time: "Утро",
      notes: "Проверка STAGING: не выдумывай фактическую погоду, глубину и текущий клёв.",
    };
    const results = await Promise.all([invoke(account.client, body), invoke(account.client, body)]);
    const successful = results.filter((x) => x.ok);
    if (!successful.length) throw new Error(safeCode(results.find((x) => x.data?.code)?.data.code));
    const fresh = successful.filter((x) => x.data?.already_used === false);
    assert.equal(fresh.length, 1, "YANDEX_CONCURRENT_DUPLICATE_SUCCESS");
    for (const result of results)
      assert.ok(result.ok || result.status === 409, "YANDEX_CONCURRENT_REQUEST_FAILED");
    const generated = fresh[0].data;
    assert.equal(generated.model, expectedModel, "YANDEX_WRONG_REAL_MODEL");
    assert.equal(
      generated.provider,
      mode === "fallback" ? "yandex-fallback" : "yandex-deepseek",
      "YANDEX_PROVIDER_MISMATCH",
    );
    assert.ok(
      typeof generated.answer === "string" && generated.answer.length >= 40,
      "YANDEX_EMPTY_ANSWER",
    );
    phase = "persistence_and_cache";
    const stored = await journal(account, "status,answer,model,attempts");
    assert.equal(stored?.status, "ready", "YANDEX_RESULT_NOT_PERSISTED");
    assert.equal(stored?.model, expectedModel, "YANDEX_STORED_MODEL_MISMATCH");
    assert.equal(stored?.answer, generated.answer, "YANDEX_STORED_ANSWER_MISMATCH");
    const cached = await invoke(account.client, body);
    assert.ok(
      cached.ok && cached.data?.already_used === true && cached.data.answer === stored.answer,
      "YANDEX_CACHE_FAILED",
    );
    assert.deepEqual(
      await journal(account),
      { status: "ready", attempts: stored.attempts },
      "YANDEX_CACHE_CHANGED_QUOTA",
    );
    output.passed = true;
    output.realModel = expectedModel;
    output.freshGeneration = true;
    output.answerCharacters = generated.answer.length;
    output.persisted = true;
    output.cachedRepeat = true;
    output.concurrentSingleSuccess = true;
    console.log(
      "PASS: Yandex " +
        mode +
        " genuine model, persistence, cache and single concurrent daily success",
    );
  } catch (error) {
    output.passed = false;
    output.phase = phase;
    output.code = safeCode(error.message);
    const state = await journal(account).catch(() => null);
    output.failedNotMarkedSuccessful = state?.status !== "ready";
    console.error("FAIL: Yandex " + mode + " " + output.code + " phase=" + phase);
    process.exitCode = 1;
  }
}
try {
  const noJwt = await fetch(url + "/functions/v1/" + functionName, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ action: "diagnose" }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(noJwt.status, 401, "YANDEX_JWT_GATE_FAILED");
  summary.jwtRequired = true;
  const owner = await login("OWNER");
  const backup = await login("SEATED");
  assert.notEqual(owner.id, backup.id);
  const weather = await owner.client.functions.invoke("openweather-current", {
    body: { city: "Нижний Новгород" },
    signal: AbortSignal.timeout(20000),
  });
  summary.weather.passed = !weather.error && typeof weather.data?.temp === "number";
  if (!summary.weather.passed) process.exitCode = 1;
  console.log(
    summary.weather.passed
      ? "PASS: independent real OpenWeather temperature"
      : "FAIL: independent OpenWeather",
  );
  await verify(owner, "primary", "deepseek-v4.1-flash", summary.primary);
  await verify(backup, "fallback", "yandexgpt-5.1", summary.fallback);
  const stranger = await backup.client
    .from("ai_daily_advices")
    .select("id")
    .eq("user_id", owner.id)
    .eq("advice_day", day);
  assert.ok(!stranger.error && stranger.data?.length === 0, "YANDEX_JOURNAL_RLS_LEAK");
  summary.strangerJournalDenied = true;
  summary.passed =
    summary.primary.passed === true &&
    summary.fallback.passed === true &&
    summary.weather.passed === true;
} catch (error) {
  summary.code = safeCode(error.message);
  process.exitCode = 1;
  console.error("FAIL: " + summary.code);
} finally {
  for (const client of clients) await client.auth.signOut({ scope: "local" }).catch(() => {});
  mkdirSync("qa/yandex-safe", { recursive: true });
  writeFileSync("qa/yandex-safe/canary.json", JSON.stringify(summary, null, 2) + "\n");
}
