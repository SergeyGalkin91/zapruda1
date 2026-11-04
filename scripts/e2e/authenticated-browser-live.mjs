/** Real confirmed STAGING users, isolated local frontend. No fake KING/spot/role.
 * Credentials never enter screenshots/logs; only owned QA rows are removed. */
import { chromium, firefox, webkit, expect } from "playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { jpeg } from "./pilot-photo-fixture.mjs";
const url = process.env.ZAPRUDA_E2E_STAGING_URL,
  key = process.env.ZAPRUDA_E2E_PUBLISHABLE_KEY;
if (url !== "https://yudtbifopfnjtjanaqrd.supabase.co" || !key)
  throw Error("STAGING_CONFIGURATION_REQUIRED");
let base = process.env.ZAPRUDA_BROWSER_BASE_URL || "http://127.0.0.1:3000";
const place = "00000000-0000-4000-8000-000000000001";
if (!["http://127.0.0.1:3000", "https://deploy-preview-93--zapruda1.netlify.app"].includes(base))
  throw Error("BROWSER_TARGET_NOT_ALLOWED");
const tag = "QA-ACCEPT-" + randomUUID();
const out = "qa/authenticated-browser";
mkdirSync(out, { recursive: true });
const result = {
  sha: process.env.GITHUB_SHA,
  environment: base + " + real Supabase STAGING JWT",
  passed: false,
  cleanup: false,
  checks: [],
  limitations: [
    "No genuine KING evidence/spot/moderator provisioned",
    "No physical device keyboard or mobile network proof",
    "No production changes",
  ],
  screenshots: [],
};
const clients = [],
  browsers = [];
let phase = "setup";
let diagnosticPage;
async function must(q) {
  const r = await q;
  if (r.error) throw Error("API_ASSERTION_FAILED");
  return r.data;
}
async function loginApi(role) {
  const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  clients.push(c);
  const r = await c.auth.signInWithPassword({
    email: process.env[`ZAPRUDA_E2E_${role}_EMAIL`],
    password: process.env[`ZAPRUDA_E2E_${role}_PASSWORD`],
  });
  if (r.error || !r.data.user?.email_confirmed_at) throw Error("CONFIRMED_TEST_ACCOUNT_REQUIRED");
  return { c, id: r.data.user.id, token: r.data.session.access_token, role };
}
async function loginUI(page, account) {
  await page.goto(base + "/auth?mode=in");
  await expect(page.getByRole("button", { name: "Войти в ZAPRUDA →", exact: true })).toBeVisible({
    timeout: 20000,
  });
  if (new URL(page.url()).origin !== new URL(base).origin)
    throw Error("LOGIN_ORIGIN_CHANGED_NO_CREDENTIALS_SENT");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env[`ZAPRUDA_E2E_${account.role}_EMAIL`]);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env[`ZAPRUDA_E2E_${account.role}_PASSWORD`]);
  await page.getByRole("button", { name: "Войти в ZAPRUDA →", exact: true }).click();
  await page.waitForURL("**/profile");
  await expect(page.getByRole("button", { name: "Выйти из аккаунта", exact: true })).toBeVisible({
    timeout: 20000,
  });
}
async function shot(page, name) {
  await page.screenshot({
    path: out + "/" + name + ".png",
    fullPage: true,
    mask: [
      page.locator("input[type=email], input[type=password]"),
      page.getByText(/[^\s]+@[^\s]+/),
    ],
  });
  result.screenshots.push(name + ".png");
}
async function unread(actor) {
  const rows = await must(actor.c.rpc("chat_room_read_summary", { p_place: place }));
  return Number(rows.find((r) => r.topic === "general")?.unread || 0);
}
try {
  const A = await loginApi("RACER_A"),
    B = await loginApi("RACER_B");
  if (A.id === B.id) throw Error("DISTINCT_ACCOUNTS_REQUIRED");
  const browser = await chromium.launch();
  browsers.push(browser);
  const ca = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    cb = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const a = await ca.newPage(),
    b = await cb.newPage();
  diagnosticPage = a;
  result.requestedBase = base;
  if (process.env.ZAPRUDA_HOSTED_PREVIEW_STATUS === "BLOCKED_NETLIFY_AUTH") {
    result.hostedStatus = "BLOCKED_NETLIFY_AUTH";
    result.limitations.push(
      "Known hosted Netlify access wall on f8fdb54/82082ae; not retried, protection retained; local proof only",
    );
  }
  for (const page of [a, b])
    await page.route("**/*", (route) => {
      if (route.request().url().includes("sonvniuwtvzzyuglscah"))
        throw Error("PRODUCTION_REQUEST_DENIED");
      return route.continue();
    });
  const atlasReads = await Promise.all(
    ["atlas_fish_species", "atlas_waterbodies", "atlas_waterbody_species", "my_atlas_progress"].map(
      (table) => must(A.c.from(table).select("*").limit(1)),
    ),
  );
  result.checks.push(
    "real JWT Atlas catalog and own invoker progress read; no catalog fixtures inserted",
  );
  const diagnostic = await A.c.functions.invoke("zapruda-daily-advice-yandex", {
    body: { action: "diagnose" },
  });
  result.ai = {
    diagnosticOnly: diagnostic.data?.diagnostic_only === true,
    configuration: diagnostic.data?.configuration || "DIAGNOSE_BLOCKED",
    webSearchEnabled: diagnostic.data?.web_search_enabled,
  };
  phase = "real-ui-login";
  await loginUI(a, A);
  await loginUI(b, B);
  result.checks.push("two distinct actual UI password logins");
  phase = "chat-read-realtime";
  const embedded = await A.c
    .from("chat_messages")
    .select("id,user_id,body,created_at,profiles(username,display_name,avatar_url,chat_city)")
    .limit(1);
  result.chatEmbeddedRead = embedded.error?.code || "OK";
  if (embedded.error) throw Error("CHAT_EMBED_QUERY_FAILED");
  await b.goto(base + "/chat");
  await expect(b.getByRole("button", { name: "Все", exact: true })).toBeEnabled();
  const before = await unread(B);
  await a.goto(base + "/chat?place=" + place + "&topic=general&country=");
  const composer = a.getByRole("textbox", { name: "Сообщение для выбранной ветки", exact: true });
  await expect(composer).toBeEnabled();
  await composer.fill(tag + " message");
  // Prove a committed message can lose its response without becoming a duplicate.
  let lost = false;
  await a.route("**/rest/v1/chat_messages*", async (route) => {
    if (route.request().method() === "POST" && !lost) {
      lost = true;
      const committed = await route.fetch();
      result.chatPostStatus = committed.status();
      if (!committed.ok()) {
        const payload = await committed.json().catch(() => ({}));
        result.chatPostCode = payload.code || "UNEXPECTED_STATUS";
      }
      await route.abort("failed");
    } else await route.continue();
  });
  await a.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect.poll(() => composer.isEnabled(), { timeout: 20000 }).toBe(true);
  const afterSend = await must(
    A.c
      .from("chat_messages")
      .select("id")
      .eq("user_id", A.id)
      .eq("body", tag + " message"),
  );
  result.chatAfterSendCount = afterSend.length;
  result.chatAlerts = await a.getByRole("alert").allTextContents();
  await expect(a.getByText(tag + " message", { exact: true })).toBeVisible({ timeout: 20000 });
  // If recovery also failed, a user retry must reuse the original UUID.
  if (await composer.inputValue())
    await a.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect
    .poll(
      async () => {
        const rows = await must(
          A.c
            .from("chat_messages")
            .select("id")
            .eq("user_id", A.id)
            .eq("body", tag + " message"),
        );
        return rows.length;
      },
      { timeout: 20000 },
    )
    .toBe(1);
  await expect.poll(() => unread(B), { timeout: 20000 }).toBeGreaterThan(before);
  await b.getByRole("button", { name: "Непрочитанные", exact: true }).click();
  diagnosticPage = b;
  const general = b.getByRole("button", { name: /^Общий/ });
  await expect(general).toBeVisible({ timeout: 20000 });
  await general.click();
  await expect(b.getByText(tag + " message", { exact: true })).toBeVisible({ timeout: 20000 });
  await b.getByText(tag + " message", { exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => unread(B), { timeout: 20000 }).toBe(0);
  await b.reload();
  await expect(b.getByText(tag + " message", { exact: true })).toBeVisible();
  await expect.poll(() => unread(B)).toBe(0);
  const foreign = await A.c
    .from("chat_read_state")
    .update({ last_read_at: new Date().toISOString() })
    .eq("user_id", B.id)
    .select("user_id");
  if (!foreign.error && foreign.data?.length) throw Error("FOREIGN_READ_MARKER_MUTABLE");
  await composer.fill(tag + " retained draft");
  await must(
    B.c.from("chat_messages").insert({
      id: randomUUID(),
      user_id: B.id,
      place_id: place,
      topic: "general",
      body: tag + " reply event",
    }),
  );
  await expect(a.getByText(tag + " reply event", { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(composer).toHaveValue(tag + " retained draft");
  await composer.fill("");
  await shot(b, "390-chat-after-read");
  result.checks.push(
    "UI send lost-response recovery: one persisted message; B unread via Realtime; open/read/reload; foreign marker denied; real Realtime preserves draft",
  );
  diagnosticPage = a;
  phase = "wizard-private-publication";
  for (const withFish of [false, true]) {
    await a.goto(base + "/reports/new");
    await expect(
      a.getByRole("button", { name: "Перенести Street-сессию", exact: true }),
    ).toBeEnabled();
    if (await a.getByRole("button", { name: "Очистить черновик", exact: true }).isVisible())
      await a.getByRole("button", { name: "Очистить черновик", exact: true }).click();
    await a
      .getByLabel("Название отчёта *", { exact: true })
      .fill(tag + (withFish ? " fish-private" : " no-catch-private"));
    await a.getByLabel("Дата рыбалки", { exact: true }).fill(new Date().toISOString().slice(0, 10));
    await a
      .getByLabel("Вид рыбалки для достижений *", { exact: true })
      .selectOption({ label: "Фидер" });
    await a.reload();
    await expect(a.getByLabel("Название отчёта *", { exact: true })).toHaveValue(
      tag + (withFish ? " fish-private" : " no-catch-private"),
    );
    await a.getByRole("button", { name: "Далее", exact: true }).click();
    if (withFish) {
      await a.getByPlaceholder("Вид (щука, окунь…)").fill("QA техническая запись");
      await a.getByPlaceholder("Вес, кг").fill("0.1");
      await a
        .getByRole("button", { name: "Выбрать фотографии с рыбалки", exact: true })
        .isVisible()
        .catch(() => false);
      await a
        .locator("input[type=file]")
        .setInputFiles({ name: "technical-qa.jpg", mimeType: "image/jpeg", buffer: jpeg });
    }
    await a
      .getByLabel("Рассказ", { exact: true })
      .fill("Private technical acceptance, not a real catch claim.");
    await a.getByRole("button", { name: "Далее", exact: true }).click();
    await expect(a.getByRole("heading", { name: "Проверь отчёт", exact: true })).toBeVisible();
    // Critical regression: going 2→3 never writes anything.
    const premature = await must(
      A.c
        .from("fishing_reports")
        .select("id")
        .eq("title", tag + (withFish ? " fish-private" : " no-catch-private")),
    );
    if (premature.length) throw Error("NEXT_SUBMITTED_FORM");
    await a.getByRole("button", { name: "Назад", exact: true }).click();
    await expect(a.getByLabel("Рассказ", { exact: true })).toHaveValue(
      "Private technical acceptance, not a real catch claim.",
    );
    await a.getByRole("button", { name: "Далее", exact: true }).click();
    if (!withFish) {
      await a.reload();
      await expect(a.getByRole("heading", { name: "Проверь отчёт", exact: true })).toBeVisible();
    }
    await expect(a.getByLabel("Опубликовать в общей ленте", { exact: true })).not.toBeChecked();
    await a.getByLabel("Опубликовать в общей ленте", { exact: true }).check();
    await expect(a.getByText("Отчёт будет виден в общей ленте.", { exact: false })).toBeVisible();
    await a.getByLabel("Опубликовать в общей ленте", { exact: true }).uncheck();
    await shot(a, withFish ? "390-review-private-photo" : "390-review-no-catch");
    if (withFish) {
      let dropped = false;
      await a.route("**/rest/v1/rpc/publish_report_with_catches", async (route) => {
        if (!dropped) {
          dropped = true;
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      });
      await a.getByRole("button", { name: "Опубликовать отчёт", exact: true }).click();
      await expect(a.getByRole("alert")).toContainText("Не удалось сохранить отчёт с уловом", {
        timeout: 20000,
      });
    }
    await a.getByRole("button", { name: "Опубликовать отчёт", exact: true }).click();
    await a.waitForURL(base + "/", { timeout: 30000 });
    const rows = await must(
      A.c
        .from("fishing_reports")
        .select("id,is_public")
        .eq("title", tag + (withFish ? " fish-private" : " no-catch-private")),
    );
    if (rows.length !== 1 || rows[0].is_public) throw Error("REPORT_DUPLICATE_OR_PUBLIC");
    if (withFish) {
      const counts = await must(A.c.from("catches").select("id").eq("report_id", rows[0].id));
      if (counts.length !== 1) throw Error("CATCH_RETRY_DUPLICATE");
    }
    const outsider = await must(B.c.from("fishing_reports").select("id").eq("id", rows[0].id));
    if (outsider.length) throw Error("REPORT_PRIVATE_LEAK");
  }
  result.checks.push(
    "actual wizard: catch/no-catch, photo, back/next, restored draft, private submit, outsider denial, no premature publish",
  );
  phase = "street-identity-import";
  await a.goto(base + "/street");
  await expect(a.getByRole("button", { name: "Начать сессию", exact: true })).toBeVisible();
  await a.getByRole("button", { name: "Начать сессию", exact: true }).click();
  await a.getByLabel("Снасти", { exact: true }).fill(tag + " tackle");
  await a.getByLabel("Приманки", { exact: true }).fill(tag + " lure");
  await a.reload();
  await expect(a.getByLabel("Снасти", { exact: true })).toHaveValue(tag + " tackle");
  await a.getByLabel("Вид пойманной рыбы", { exact: true }).fill("QA technical entry");
  await a.getByRole("button", { name: "Добавить улов", exact: true }).click();
  await expect(a.getByText(/1 мин/)).toBeVisible({ timeout: 70000 });
  await a.getByRole("button", { name: "Завершить сессию", exact: true }).click();
  await a.getByRole("link", { name: "Оформить отчёт", exact: true }).click();
  await expect(
    a.getByRole("button", { name: "Перенести Street-сессию", exact: true }),
  ).toBeEnabled();
  await a.getByRole("button", { name: "Перенести Street-сессию", exact: true }).click();

  await a
    .getByLabel("Вид рыбалки для достижений *", { exact: true })
    .selectOption({ label: "Спиннинг" });
  await a.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(a.getByLabel("Снасти", { exact: true })).toHaveValue(tag + " tackle");
  // Switch identity in the SAME context through real logout/login.
  await a.goto(base + "/profile");
  await a.getByRole("button", { name: "Выйти из аккаунта", exact: true }).click();
  await loginUI(a, B);
  await a.goto(base + "/street");
  await expect(a.getByRole("button", { name: "Начать сессию", exact: true })).toBeVisible();
  result.checks.push(
    "STREET tick >1 min, reload, tackle/lure, catch log, opt-in import, same-browser account isolation",
  );
  phase = "authenticated-matrix";
  for (const [engine, name] of [
    [chromium, "chromium"],
    [firefox, "firefox"],
    [webkit, "webkit"],
  ]) {
    const br = await engine.launch();
    browsers.push(br);
    const ctx = await br.newContext();
    const p = await ctx.newPage();
    diagnosticPage = p;
    await loginUI(p, A);
    for (const width of [320, 390, 768, 1440])
      for (const theme of ["matte", "electric-blue"]) {
        await p.setViewportSize({ width, height: 900 });
        await p.goto(base + "/settings");
        await p
          .getByRole("button", { name: theme === "matte" ? /^Matte Black/ : /^Electric Blue/ })
          .click();
        for (const [path, label] of [
          ["/", "feed"],
          ["/communities", "communities"],
          ["/chat", "chat"],
          ["/partners", "trips"],
          ["/reports/new", "report"],
          ["/street", "street"],
          ["/competitions", "spot"],
          ["/profile", "profile"],
          ["/settings", "settings"],
          ["/admin", "admin-denied"],
        ]) {
          await p.goto(base + path);
          await p.locator("main").waitFor();
          await expect(p.getByRole("link", { name: "Профиль", exact: true })).toBeVisible({
            timeout: 20000,
          });
          if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
            throw Error("AUTHENTICATED_HORIZONTAL_OVERFLOW");
          await shot(p, `${name}-${width}-${theme}-${label}`);
        }
      }
    await br.close();
  }
  result.checks.push(
    "authenticated 3-engine x 4-width x 2-theme route screenshots and overflow; unauthorized admin only",
  );
  result.passed = true;
} catch (e) {
  result.phase = phase;
  result.error = /^[A-Z_]+$/.test(String(e?.message)) ? e.message : "BROWSER_ASSERTION_FAILED";
  // Keep actionable assertions, stripping credentials/tokens/contact values.
  let detail = String(e?.message || "");
  for (const [k, v] of Object.entries(process.env))
    if (/ZAPRUDA_E2E_.*(?:KEY|EMAIL|PASSWORD)/.test(k) && v)
      detail = detail.split(v).join("[REDACTED]");
  result.detail = detail
    .replace(/[^\s]+@[^\s]+/g, "[EMAIL]")
    .replace(/eyJ[A-Za-z0-9_.-]+/g, "[JWT]")
    .slice(0, 1400);
  if (diagnosticPage) await shot(diagnosticPage, "failure-" + phase).catch(() => {});
  process.exitCode = 1;
} finally {
  try {
    for (const c of clients) {
      const rows = await must(
        c
          .from("fishing_reports")
          .select("id")
          .like("title", tag + "%"),
      );
      for (const row of rows) {
        const photos = await must(c.from("report_photos").select("id").eq("report_id", row.id));
        for (const ph of photos) {
          const sess = await c.auth.getSession();
          const r = await fetch(url + "/functions/v1/report-photo-access?photo_id=" + ph.id, {
            method: "DELETE",
            headers: { apikey: key, Authorization: "Bearer " + sess.data.session.access_token },
          });
          if (![204, 404].includes(r.status)) throw Error("PHOTO_CLEANUP");
        }
        await must(c.from("fishing_reports").delete().eq("id", row.id));
      }
      await must(
        c
          .from("chat_messages")
          .delete()
          .like("body", tag + "%"),
      );
    }
    result.cleanup = true;
  } catch {
    result.cleanup = false;
    process.exitCode = 1;
  }
  for (const b of browsers) await b.close().catch(() => {});
  writeFileSync(out + "/result.json", JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      passed: result.passed,
      cleanup: result.cleanup,
      phase: result.phase,
      checks: result.checks,
      error: result.error,
    }),
  );
}
