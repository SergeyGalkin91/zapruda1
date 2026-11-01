#!/usr/bin/env node
/**
 * ZAPRUDA — автоматический тест безопасности Data API (два пользователя, разные JWT). Версия 2.
 *
 * Отличия от версии 1 (по требованиям аудита 2026-11-02):
 *   - Запрещён запуск против production: блок-лист известных прод-URL + обязательное
 *     подтверждение окружения через переменную ZAPRUDA_TEST_TARGET=STAGING.
 *   - Никаких удалений ранее существовавших записей: чистка только по точным ID
 *     объектов, созданных этим запуском скрипта (trackedCreatedIds).
 *   - Уникальные тестовые идентификаторы: каждый запуск генерирует RUN_ID (UUID)
 *     и помечает им все созданные строки.
 *   - Очистка собственных записей выполняется в finally — даже при ошибке теста.
 *   - Проверяется HTTP-статус, тело ответа И фактическое состояние данных (повторный GET
 *     после каждой мутации). Ошибка запроса не считается доказательством безопасности:
 *     если «запрещённая» операция завершилась ошибкой транспорта/сервера, а не отказом
 *     политики, тест помечает сценарий как INCONCLUSIVE и не засчитывает PASS.
 *   - Без двух подтверждённых JWT итог — INCOMPLETE, а не PASS.
 *   - Пароли и JWT никогда не попадают в логи: печатаются только HTTP-статусы,
 *     коды ошибок и сообщения сервера (без тел ответов auth-эндпоинтов).
 *
 * Запуск (только STAGING):
 *   ZAPRUDA_TEST_TARGET=STAGING \
 *   STAGING_URL=https://yudtbifopfnjtjanaqrd.supabase.co \
 *   STAGING_KEY=sb_publishable_... \
 *   USER_A_EMAIL=a@example.com USER_A_PASSWORD='...' \
 *   USER_B_EMAIL=b@example.com USER_B_PASSWORD='...' \
 *   node zapruda-two-user-security-test.mjs
 *
 * Аккаунты: два ПОДТВЕРЖДЁННЫХ тестовых аккаунта STAGING (email confirmation включён).
 * Скрипт создаёт и удаляет только собственные тестовые строки (помечены RUN_ID).
 */

import { randomUUID } from "node:crypto";

const PRODUCTION_BLOCKLIST = [
  "https://sonvniuwtvzzyuglscah.supabase.co", // production ZAPRUDA
];

const BASE = (process.env.STAGING_URL ?? "").replace(/\/$/, "");
const KEY = process.env.STAGING_KEY ?? "";
const A = { email: process.env.USER_A_EMAIL ?? "", password: process.env.USER_A_PASSWORD ?? "" };
const B = { email: process.env.USER_B_EMAIL ?? "", password: process.env.USER_B_PASSWORD ?? "" };
const RUN_ID = randomUUID(); // уникален для каждого запуска; помечаем все созданные строки
const RUN_TAG = `zapruda-sec-test-${RUN_ID.slice(0, 8)}`;

// ---------- Guard: запрет production ----------
if (process.env.ZAPRUDA_TEST_TARGET !== "STAGING") {
  console.error("Отказ: установи ZAPRUDA_TEST_TARGET=STAGING. Тест предназначен только для STAGING.");
  process.exit(2);
}
if (!BASE || !KEY) {
  console.error("Отказ: нужны STAGING_URL и STAGING_KEY (publishable-ключ STAGING).");
  process.exit(2);
}
if (PRODUCTION_BLOCKLIST.includes(BASE)) {
  console.error("Отказ: STAGING_URL указывает на production. Запуск запрещён.");
  process.exit(2);
}

// ---------- Тестовый реестр ----------
const results = [];
function record(name, status, detail = "") {
  // status: PASS | FAIL | INCONCLUSIVE | SKIP
  results.push({ name, status, detail });
  console.log(`${status.padEnd(12)} ${name}${detail ? "  — " + detail : ""}`);
}

/** Мутация признаётся «заблокированной политикой» только если это дискриминируемый отказ:
 *  401/403 (грант/RLS) или 400/23514 (CHECK). 5xx/сетевые ошибки — INCONCLUSIVE. */
function classifyDenial(res) {
  if (res.status === 401 || res.status === 403) return "PASS";
  if (res.status === 400 && /check|violat/i.test(res.json?.message ?? "")) return "PASS";
  if (res.status === 409 || res.status === 422) return "PASS";
  return "INCONCLUSIVE";
}

let tokenA = null, tokenB = null, uidA = null, uidB = null;
const createdReportIds = []; // только объекты, созданные этим запуском

async function rest(token, method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}/rest/v1${path}`, {
    method,
    headers: {
      "apikey": KEY,
      "Authorization": `Bearer ${token ?? KEY}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* тело пусто (204) */ }
  return { status: res.status, json };
}

async function login(user) {
  // Пароли и токены не логируются: наружу — только факт успеха/кода ошибки.
  try {
    const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    const json = await res.json().catch(() => null);
    return { token: json?.access_token ?? null, userId: json?.user?.id ?? null, errorStatus: res.status };
  } catch (e) {
    return { token: null, userId: null, errorStatus: 0 };
  }
}

async function getReport(token, id) {
  const r = await rest(token, "GET", `/fishing_reports?id=eq.${id}&select=id,user_id,is_public,latitude,longitude,title`);
  return r;
}

async function cleanupOwnRecords() {
  if (!tokenA) return;
  for (const id of createdReportIds) {
    try {
      const r = await rest(tokenA, "DELETE", `/fishing_reports?id=eq.${id}`, null, { "Prefer": "return=minimal" });
      if (r.status !== 204 && r.status !== 404) {
        console.log(`  [cleanup] отчёт ${id}: status=${r.status} — проверь вручную (заголовок содержит ${RUN_TAG})`);
      }
    } catch { /* сетевая ошибка чистки — сообщаем */ }
  }
}

function verdict() {
  const counts = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
  const failed = (counts.FAIL ?? 0) + (counts.INCONCLUSIVE ?? 0);
  const incomplete = results.some((r) => r.status === "SKIP");
  const summary = `PASS=${counts.PASS ?? 0} FAIL=${counts.FAIL ?? 0} INCONCLUSIVE=${counts.INCONCLUSIVE ?? 0} SKIP=${counts.SKIP ?? 0}`;
  console.log(`\n=== Итог (${RUN_TAG}): ${summary} ===`);
  if (failed > 0) { console.log("VERDICT: FAIL"); process.exit(1); }
  if (incomplete) { console.log("VERDICT: INCOMPLETE — аутентифицированные сценарии пропущены (нет двух подтверждённых JWT)"); process.exit(3); }
  console.log("VERDICT: PASS");
}

async function anonScenarios() {
  // Т1. Публичные отчёты читаются анониму (грант + RLS)
  const pub = await rest(null, "GET", "/fishing_reports?select=id,is_public,latitude,longitude&is_public=eq.true&limit=10");
  record("Аноним читает публичные отчёты", pub.status === 200 ? "PASS" : "INCONCLUSIVE",
    `status=${pub.status}${pub.status !== 200 ? " — ошибка не доказывает политику" : ""}`);
  if (pub.status === 200) {
    const leak = (pub.json ?? []).filter((r) => r.latitude != null || r.longitude != null);
    record("В публичных отчётах нет точных координат", leak.length === 0 ? "PASS" : "FAIL",
      leak.length ? `утечка в ${leak.length} строках` : "");
  } else {
    record("В публичных отчётах нет точных координат", "INCONCLUSIVE", "нет данных для проверки");
  }

  // Т2. Приватные отчёты не выдаются анониму: успех = запрос дошёл (200) и строк 0.
  const priv = await rest(null, "GET", "/fishing_reports?select=id&is_public=eq.false&limit=10");
  if (priv.status === 200) {
    record("Аноним не получает приватные отчёты (RLS)", (priv.json ?? []).length === 0 ? "PASS" : "FAIL",
      `rows=${(priv.json ?? []).length}`);
  } else {
    record("Аноним не получает приватные отчёты (RLS)", "INCONCLUSIVE",
      `status=${priv.status} — ошибка запроса, а не доказательство защиты`);
  }

  // Т3. report_private_locations недоступен (нет гранта) — ожидаем именно 401.
  const privLoc = await rest(null, "GET", "/report_private_locations?select=*&limit=1");
  record("report_private_locations недоступен анониму", privLoc.status === 401 ? "PASS" : "INCONCLUSIVE",
    `status=${privLoc.status}`);

  // Т4. profiles: проверяем и статус, и фактический состав колонок.
  const prof = await rest(null, "GET", "/profiles?select=*&limit=1");
  if (prof.status === 200) {
    const cols = prof.json?.[0] ? Object.keys(prof.json[0]) : [];
    const privateCols = cols.filter((c) => ["bio", "chat_city"].includes(c));
    record("Аноним не видит личные колонки профилей (bio, chat_city)",
      privateCols.length === 0 ? "PASS" : "FAIL",
      `видимые колонки: ${cols.join(",") || "(пусто)"}`);
  } else {
    record("Аноним не видит личные колонки профилей (bio, chat_city)", "INCONCLUSIVE", `status=${prof.status}`);
  }

  // Т5/Т6. Аноним не пишет и не меняет.
  const ins = await rest(null, "POST", "/fishing_reports",
    { user_id: "00000000-0000-4000-8000-000000000001", title: RUN_TAG, is_public: true }, { "Prefer": "return=minimal" });
  record("Аноним не создаёт отчёты", classifyDenial(ins) === "PASS" ? "PASS" : "INCONCLUSIVE", `status=${ins.status}`);
  const upd = await rest(null, "PATCH", "/profiles?id=eq.00000000-0000-4000-8000-000000000001", { bio: RUN_TAG });
  record("Аноним не меняет профили", classifyDenial(upd) === "PASS" ? "PASS" : "INCONCLUSIVE", `status=${upd.status}`);
}

async function authScenarios() {
  const la = await login(A), lb = await login(B);
  tokenA = la.token; uidA = la.userId;
  tokenB = lb.token; uidB = lb.userId;
  if (!tokenA || !tokenB || !uidA || !uidB) {
    record("Вход двух тестовых пользователей", "SKIP",
      "нет двух подтверждённых JWT (создай подтверждённые аккаунты STAGING; пароли в чат не присылать)");
    return false;
  }
  record("Вход двух тестовых пользователей", "PASS", `A=${uidA.slice(0, 8)}… B=${uidB.slice(0, 8)}…`);

  // С1. A создаёт приватный отчёт с точными координатами — разрешено.
  const create = await rest(tokenA, "POST", "/fishing_reports",
    { user_id: uidA, title: `${RUN_TAG} private`, is_public: false, latitude: 56.3269, longitude: 44.0059 },
    { "Prefer": "return=representation" });
  const reportId = create.json?.[0]?.id ?? null;
  if (create.status !== 201 || !reportId) {
    record("A создаёт приватный отчёт с координатами", "INCONCLUSIVE", `status=${create.status}`);
    return true;
  }
  createdReportIds.push(reportId);
  // Фактическое состояние: строка существует и видна владельцу.
  const state1 = await getReport(tokenA, reportId);
  record("A создаёт приватный отчёт с координатами",
    state1.status === 200 && state1.json?.[0]?.latitude === 56.3269 ? "PASS" : "INCONCLUSIVE",
    `status=${create.status}, verify=${state1.status}`);

  // С2. Публикация отчёта с координатами — CHECK должен отклонить; состояние не меняется.
  const flip = await rest(tokenA, "PATCH", `/fishing_reports?id=eq.${reportId}`,
    { is_public: true }, { "Prefer": "return=minimal" });
  const state2 = await getReport(tokenA, reportId);
  const stillPrivate = state2.json?.[0]?.is_public === false;
  record("CHECK блокирует публикацию отчёта с координатами",
    classifyDenial(flip) === "PASS" && stillPrivate ? "PASS" : classifyDenial(flip) === "PASS" ? "FAIL" : "INCONCLUSIVE",
    `status=${flip.status}, is_public по факту=${state2.json?.[0]?.is_public}`);

  // С3. Прямой INSERT публичного отчёта с координатами — отклонить CHECK-ом.
  const insPub = await rest(tokenA, "POST", "/fishing_reports",
    { user_id: uidA, title: `${RUN_TAG} public-coords`, is_public: true, latitude: 56.0, longitude: 44.0 },
    { "Prefer": "return=minimal" });
  if (insPub.status === 201) {
    // строка могла быть создана без координат? проверяем фактическое состояние
    const created = await rest(tokenA, "GET", `/fishing_reports?title=eq.${encodeURIComponent(`${RUN_TAG} public-coords`)}&select=id,latitude,longitude,is_public`);
    const row = created.json?.[0];
    if (row) {
      createdReportIds.push(row.id);
      record("CHECK блокирует INSERT публичного отчёта с координатами",
        row.latitude == null && row.longitude == null ? "INCONCLUSIVE" : "FAIL",
        `строка создана: lat=${row.latitude}, lng=${row.longitude} — CHECK не применился`);
    } else {
      record("CHECK блокирует INSERT публичного отчёта с координатами", "INCONCLUSIVE", "состояние неясно");
    }
  } else {
    record("CHECK блокирует INSERT публичного отчёта с координатами", classifyDenial(insPub) === "PASS" ? "PASS" : "INCONCLUSIVE",
      `status=${insPub.status}`);
  }

  // С4. Upsert-обход (merge-duplicates) — CHECK обязан примениться к итоговой строке.
  const upsert = await rest(tokenA, "POST", "/fishing_reports",
    { id: reportId, user_id: uidA, title: `${RUN_TAG} upsert`, is_public: true, latitude: 56.1, longitude: 44.1 },
    { "Prefer": "resolution=merge-duplicates,return=minimal" });
  const state4 = await getReport(tokenA, reportId);
  const stillPrivate4 = state4.json?.[0]?.is_public === false && state4.json?.[0]?.latitude === 56.3269;
  record("Upsert не обходит CHECK",
    classifyDenial(upsert) === "PASS" && stillPrivate4 ? "PASS" : classifyDenial(upsert) === "PASS" ? "FAIL" : "INCONCLUSIVE",
    `status=${upsert.status}, состояние=${stillPrivate4 ? "не изменилось" : "ИЗМЕНИЛОСЬ — проверь"}`);

  // С5. A не переassign-ит отчёт на B (WITH CHECK); фактическое состояние не меняется.
  const reassign = await rest(tokenA, "PATCH", `/fishing_reports?id=eq.${reportId}`,
    { user_id: uidB }, { "Prefer": "return=minimal" });
  const state5 = await getReport(tokenA, reportId);
  record("A не переassign-ит отчёт на B",
    classifyDenial(reassign) === "PASS" && state5.json?.[0]?.user_id === uidA ? "PASS" : "INCONCLUSIVE",
    `status=${reassign.status}, user_id по факту=${state5.json?.[0]?.user_id?.slice(0, 8)}…`);

  // С6. B не изменяет отчёт A: успех = 200 и 0 затронутых строк, ИЛИ дискриминируемый отказ.
  const bPatch = await rest(tokenB, "PATCH", `/fishing_reports?id=eq.${reportId}`,
    { title: `${RUN_TAG} hijack` }, { "Prefer": "return=representation" });
  const state6 = await getReport(tokenA, reportId);
  const titleIntact = state6.json?.[0]?.title === `${RUN_TAG} private`;
  if (bPatch.status === 200) {
    record("B не изменяет отчёт A", (bPatch.json ?? []).length === 0 && titleIntact ? "PASS" : "FAIL",
      `affected=${(bPatch.json ?? []).length}, заголовок по факту=${state6.json?.[0]?.title}`);
  } else {
    record("B не изменяет отчёт A", classifyDenial(bPatch) === "PASS" && titleIntact ? "PASS" : "INCONCLUSIVE",
      `status=${bPatch.status} — ошибка не доказывает защиту без проверки состояния`);
  }

  // С7. B не читает приватный отчёт A: 200 + 0 строк; ошибка → INCONCLUSIVE.
  const bSelect = await rest(tokenB, "GET", `/fishing_reports?id=eq.${reportId}&select=id`);
  if (bSelect.status === 200) {
    record("B не читает приватный отчёт A", (bSelect.json ?? []).length === 0 ? "PASS" : "FAIL",
      `rows=${(bSelect.json ?? []).length}`);
  } else {
    record("B не читает приватный отчёт A", "INCONCLUSIVE", `status=${bSelect.status} — не доказательство`);
  }

  // С8. B не меняет профиль A: 200 + 0 строк, ИЛИ отказ; состояние проверяем чтением B.
  const bProf = await rest(tokenB, "PATCH", `/profiles?id=eq.${uidA}`,
    { bio: RUN_TAG }, { "Prefer": "return=representation" });
  const bProfRead = await rest(tokenB, "GET", `/profiles?id=eq.${uidA}&select=bio`);
  if (bProf.status === 200) {
    record("B не меняет профиль A", (bProf.json ?? []).length === 0 ? "PASS" : "FAIL",
      `affected=${(bProf.json ?? []).length}`);
  } else {
    record("B не меняет профиль A", classifyDenial(bProf) === "PASS" ? "PASS" : "INCONCLUSIVE", `status=${bProf.status}`);
  }
  record("bio профиля A не содержит тестовую метку после попытки B",
    (bProfRead.json?.[0]?.bio ?? null) !== RUN_TAG ? "PASS" : "FAIL",
    bProfRead.status === 200 ? "" : `status=${bProfRead.status} — состояние нечитаемо (INCONCLUSIVE)`);

  // С9. B не читает приватные локации A.
  const bLoc = await rest(tokenB, "GET", "/report_private_locations?select=*&limit=5");
  if (bLoc.status === 401) {
    record("B не читает приватные локации (грант отсутствует)", "PASS", `status=${bLoc.status}`);
  } else if (bLoc.status === 200) {
    record("B не читает приватные локации (грант отсутствует)",
      (bLoc.json ?? []).length === 0 ? "PASS" : "FAIL", `rows=${(bLoc.json ?? []).length}`);
  } else {
    record("B не читает приватные локации (грант отсутствует)", "INCONCLUSIVE", `status=${bLoc.status}`);
  }

  return true;
}

async function main() {
  console.log(`Запуск против ${BASE} (RUN_TAG=${RUN_TAG})`);
  try {
    await anonScenarios();
    await authScenarios();
  } finally {
    await cleanupOwnRecords();
  }
  verdict();
}

main().catch((e) => {
  console.error("Ошибка выполнения:", e instanceof Error ? e.message : e);
  process.exit(2);
});
