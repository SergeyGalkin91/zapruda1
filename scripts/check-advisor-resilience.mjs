import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium, firefox } = createRequire(import.meta.url)("playwright");
const engine = process.env.PLAN_BROWSER ?? "chromium";
assert.ok(["chromium", "firefox"].includes(engine));
const browser = await (engine === "firefox" ? firefox : chromium).launch();
const base = "http://127.0.0.1:4191";
const results = [];
let currentPage;
mkdirSync("qa/advisor", { recursive: true });
// Disconnected HTTP fixtures only. This token has no valid signature and is
// never sent to any real Supabase project. These are UI tests, not live JWT E2E.
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "advisor-qa@example.invalid",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  confirmed_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { username: "QA_ADVISOR" },
  identities: [],
  is_anonymous: false,
};
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.offline-invalid-signature`;
try {
  for (const width of [390, 1280]) {
    for (const authenticated of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      if (authenticated)
        await context.addInitScript(
          ({ user, token }) => {
            localStorage.setItem(
              "sb-ci-placeholder-auth-token",
              JSON.stringify({
                access_token: token,
                refresh_token: "offline-invalid-refresh",
                token_type: "bearer",
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                expires_in: 3600,
                user,
              }),
            );
          },
          { user, token },
        );
      const page = await context.newPage();
      currentPage = page;
      const errors = [],
        production = [],
        writes = [],
        functions = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("https://**.supabase.co/**", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.hostname !== "ci-placeholder.supabase.co") production.push(url.hostname);
        if (url.pathname.startsWith("/auth/v1/user"))
          return route.fulfill({
            status: authenticated ? 200 : 401,
            contentType: "application/json",
            body: JSON.stringify(authenticated ? user : { error: "Disconnected guest fixture" }),
          });
        if (url.pathname.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
        if (url.pathname.startsWith("/functions/v1/")) {
          functions.push(url.pathname);
          return route.fulfill({
            status: 502,
            contentType: "application/json",
            body: JSON.stringify({
              error: "PRIVATE_PROVIDER_DIAGNOSTIC",
              code: "XAI_INVALID_API_KEY",
            }),
          });
        }
        if (url.pathname.startsWith("/rest/v1/") && !["GET", "HEAD"].includes(request.method()))
          writes.push(url.pathname);
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      });
      await page.goto(base + "/assistant", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "План рыбалки и совет Grok", exact: true }).waitFor();
      // The server-rendered form is visible before React attaches handlers.
      // Wait for the disconnected Auth fixture's client render before typing;
      // a hung Auth path is separately covered by the component regression.
      if (authenticated)
        await page.getByRole("button", { name: "Добавить совет Grok", exact: true }).waitFor();
      else await page.getByRole("link", { name: "войди в аккаунт", exact: true }).waitFor();
      const place = page.getByRole("textbox", { name: "Водоём / примерное место", exact: true });
      await place.fill("QA синтетический водоём");
      await page.getByRole("combobox", { name: "Рыба", exact: true }).selectOption("Окунь");
      await page
        .getByRole("combobox", { name: "Когда собираешься ловить", exact: true })
        .selectOption("Ночь");
      await page.getByRole("button", { name: "Составить план", exact: true }).click();
      const plan = page.getByRole("region", { name: "План по правилам", exact: true });
      await plan.waitFor();
      assert.match(await plan.textContent(), /Источник: правила ZAPRUDA · без генерации ИИ/);
      assert.match(await plan.textContent(), /Ночной выход/);
      assert.deepEqual(functions, []);
      if (authenticated) {
        const grok = page.getByRole("button", { name: "Добавить совет Grok", exact: true });
        await grok.waitFor();
        await grok.click();
        await page
          .getByText("Grok временно недоступен. План по правилам готов — им можно пользоваться.", {
            exact: true,
          })
          .waitFor();
        assert.equal(await plan.isVisible(), true);
        assert.equal(await page.getByRole("alert").count(), 0);
        assert.equal(
          await page.getByRole("region", { name: "Совет Grok за сегодня", exact: true }).count(),
          0,
        );
        assert.deepEqual(functions, ["/functions/v1/zapruda-daily-advice"]);
        assert.doesNotMatch(
          await page.locator("body").textContent(),
          /PRIVATE_PROVIDER_DIAGNOSTIC|XAI_INVALID_API_KEY/,
        );
      }
      await place.fill("QA следующий участок");
      await page.getByRole("button", { name: "Составить план", exact: true }).click();
      assert.match(await plan.textContent(), /QA следующий участок/);
      assert.equal(functions.length, authenticated ? 1 : 0);
      assert.deepEqual(errors, []);
      assert.deepEqual(production, []);
      assert.deepEqual(writes, []);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        ),
        false,
      );
      await page.screenshot({
        path: `qa/advisor/${engine}-${width}-${authenticated ? "provider-failure" : "guest"}.png`,
        fullPage: true,
      });
      results.push({
        browser: engine,
        width,
        authenticatedFixture: authenticated,
        localPlan: true,
        providerFailureContained: authenticated,
        serverWrites: 0,
        productionRequests: 0,
      });
      await context.close();
    }
  }
  writeFileSync(
    `qa/advisor/${engine}.json`,
    JSON.stringify({ transport: "disconnected synthetic HTTP fixtures", results }, null, 2),
  );
  console.log("PASS advisor availability", JSON.stringify(results));
} catch (error) {
  if (currentPage && !currentPage.isClosed())
    await currentPage
      .screenshot({ path: `qa/advisor/${engine}-failure.png`, fullPage: true })
      .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
