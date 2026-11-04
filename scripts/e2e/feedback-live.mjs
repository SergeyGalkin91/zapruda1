/** Real protected JWTs against STAGING v1; no mocks, no Telegram, no privileged key.
 * Exact owned QA UUIDs are emitted for the authorized external cleanup operator.
 * No email, password, token, contact, private text or real user UUID is logged. */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
const url = process.env.ZAPRUDA_E2E_STAGING_URL;
const key = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
const marker = "QA-FEEDBACK-" + randomUUID();
const result = {
  test: "feedback real JWT",
  marker,
  passed: false,
  checks: [],
  ownedRequestIds: [],
  cleanup: "external-exact-QA-UUIDs-required",
};
const clients = [];
let phase = "configuration";
const requireThat = (ok, code) => {
  if (!ok) throw new Error(code);
};
const checked = (name) => result.checks.push(name);
async function login(role) {
  const api = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  clients.push(api);
  const auth = await api.auth.signInWithPassword({
    email: process.env[`ZAPRUDA_E2E_${role}_EMAIL`] ?? "",
    password: process.env[`ZAPRUDA_E2E_${role}_PASSWORD`] ?? "",
  });
  requireThat(!auth.error && auth.data.session?.access_token, "FEEDBACK_LOGIN_FAILED");
  const current = await api.auth.getUser();
  requireThat(
    !current.error && current.data.user?.email_confirmed_at && !current.data.user.is_anonymous,
    "FEEDBACK_CONFIRMED_USER_REQUIRED",
  );
  return { api, id: current.data.user.id, token: auth.data.session.access_token };
}
async function submit(token, body) {
  const response = await fetch(url + "/functions/v1/submit-community-request", {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
try {
  requireThat(
    url === "https://yudtbifopfnjtjanaqrd.supabase.co" && key,
    "FEEDBACK_STAGING_REQUIRED",
  );
  requireThat(
    process.env.ZAPRUDA_FEEDBACK_E2E_TELEGRAM_DISABLED === "readback-no-outbound-code",
    "FEEDBACK_ISOLATION_NOT_VERIFIED",
  );
  phase = "real_login";
  const owner = await login("RACER_B");
  const stranger = await login("SEATED");
  requireThat(owner.id !== stranger.id, "FEEDBACK_DISTINCT_USERS_REQUIRED");
  const payload = {
    request_type: "bug",
    category: "Isolated STAGING acceptance",
    subject: marker,
    body: "Disposable private technical submission for authorized acceptance, not a real support request.",
    contact: "",
    user_id: stranger.id,
  };
  phase = "guest_and_validation";
  requireThat([401, 403].includes((await submit(null, payload)).status), "FEEDBACK_GUEST_ACCEPTED");
  requireThat(
    (await submit(owner.token, { ...payload, body: "short" })).status === 400,
    "FEEDBACK_INVALID_BODY_ACCEPTED",
  );
  checked("guest-denied-and-invalid-body-rejected");
  requireThat((await submit(owner.token, null)).status === 400, "FEEDBACK_NULL_JSON_ACCEPTED");
  // Never reset a quota or switch accounts to obtain a free allowance.
  const before = await owner.api
    .from("community_requests")
    .select("id", { count: "exact", head: true });
  requireThat(!before.error, "FEEDBACK_OWN_HISTORY_UNAVAILABLE");
  requireThat(before.count === 0, "FEEDBACK_NONEMPTY_ACCOUNT_PRECONDITION");
  phase = "concurrent_submission_and_limit";
  const responses = await Promise.all(
    Array.from({ length: 6 }, () => submit(owner.token, payload)),
  );
  for (const response of responses)
    if (
      response.status === 201 &&
      response.data.saved &&
      /^[0-9a-f-]{36}$/i.test(response.data.id ?? "")
    )
      result.ownedRequestIds.push(response.data.id);
  result.savedCount = result.ownedRequestIds.length;
  result.responseStatuses = responses.map((r) => r.status);
  result.telegramDisabled = responses.every(
    (r) => r.status !== 201 || r.data.telegram_delivered === false,
  );
  requireThat(result.savedCount > 0, "FEEDBACK_SAVE_FAILED");
  requireThat(result.telegramDisabled, "FEEDBACK_OUTBOUND_TELEGRAM_DETECTED");
  checked("confirmed-server-submission-saved-without-Telegram");
  phase = "own_and_foreign_history";
  const own = await owner.api
    .from("community_requests")
    .select("id,subject")
    .in("id", result.ownedRequestIds);
  requireThat(
    !own.error && own.data.length === result.savedCount,
    "FEEDBACK_SAVED_HISTORY_MISSING",
  );
  const other = await stranger.api
    .from("community_requests")
    .select("id,subject")
    .in("id", result.ownedRequestIds);
  requireThat(!other.error && other.data.length === 0, "FEEDBACK_FOREIGN_HISTORY_EXPOSED");
  const closed = await owner.api
    .from("community_requests")
    .select("body,contact")
    .in("id", result.ownedRequestIds);
  requireThat(closed.error, "FEEDBACK_PRIVATE_COLUMNS_EXPOSED");
  const direct = await owner.api
    .from("community_requests")
    .insert({ user_id: owner.id, request_type: "bug", subject: marker, body: payload.body });
  requireThat(direct.error, "FEEDBACK_DIRECT_CLIENT_WRITE_ALLOWED");
  checked("own-history-foreign-private-data-and-direct-write-boundaries");
  const privilegedRpc = await owner.api.rpc("submit_community_request_v075", {
    p_user_id: owner.id,
    p_request_type: "bug",
    p_category: "",
    p_subject: marker,
    p_body: payload.body,
    p_contact: "",
  });
  requireThat(privilegedRpc.error, "FEEDBACK_PRIVILEGED_RPC_EXPOSED");
  const history = await owner.api
    .from("community_requests")
    .select("id,request_type,subject,created_at,review_status,telegram_status")
    .eq("user_id", owner.id)
    .order("created_at", { ascending: false })
    .limit(8);
  result.uiHistoryWorks =
    !history.error && history.data.some((row) => result.ownedRequestIds.includes(row.id));
  if (history.error) result.uiHistoryErrorCode = history.error.code;
  result.hourlyConcurrencyLimitWorks =
    result.savedCount === 5 && responses.filter((r) => r.status === 429).length === 1;
  requireThat(result.uiHistoryWorks, "FEEDBACK_UI_HISTORY_QUERY_FAILED");
  checked("actual-frontend-history-query");
  requireThat(result.hourlyConcurrencyLimitWorks, "FEEDBACK_CONCURRENT_RATE_LIMIT_BYPASSED");
  checked("six-concurrent-real-requests-limited-to-five-saves");
  result.passed = true;
} catch (error) {
  result.failedPhase = phase;
  result.errorCode =
    error instanceof Error && /^FEEDBACK_[A-Z_]+$/.test(error.message)
      ? error.message
      : "FEEDBACK_UNEXPECTED_ERROR";
  process.exitCode = 1;
} finally {
  await Promise.allSettled(clients.map((api) => api.auth.signOut({ scope: "local" })));
  mkdirSync("qa/pilot-safe", { recursive: true });
  writeFileSync("qa/pilot-safe/feedback.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}
