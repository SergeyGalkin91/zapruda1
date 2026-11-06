const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const engines = require("playwright");
const {
  assertShellBounds,
  assertMobileNav,
  waitForMobileRoute,
  mobileRoutes,
} = require("./browser-shell-bounds.cjs");

const scope = process.env.MOBILE_BROWSER_SCOPE || "netlify";
const base =
  scope === "local-staging" ? "http://127.0.0.1:3000" : process.env.NETLIFY_MOBILE_PREVIEW;
const sha = process.env.EXPECTED_PREVIEW_SHA;
const engine = process.env.VISUAL_BROWSER || "chromium";
const staging = "yudtbifopfnjtjanaqrd.supabase.co";
const output = path.resolve("appearance-evidence", "mobile-staging", scope, engine);
const screens = [
  { name: "welcome", route: "/welcome" },
  { name: "feed", route: "/" },
  { name: "communities", route: "/communities" },
  { name: "spot", route: "/competitions" },
  { name: "profile", route: "/profile" },
];
const reportRead = new RegExp(
  "^https://" + staging.replaceAll(".", "\\.") + "/rest/v1/fishing_reports(?:\\?|$)",
);
const spotRead = new RegExp(
  "^https://" + staging.replaceAll(".", "\\.") + "/rest/v1/zc_public_spots(?:\\?|$)",
);
const feedResult = ".z-feed-card, .z-feed-empty, [data-z-screen=feed] main [role=alert]";

async function waitForExactPreview() {
  assert.match(base || "", /^https:\/\/deploy-preview-[1-9][0-9]*--zapruda1\.netlify\.app$/);
  let outcome = "pending";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let redirect = null;
    try {
      const response = await fetch(base + "/__qa/premium.html", {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      redirect = response.headers.get("location");
      outcome = "HTTP " + response.status;
      if (response.ok) {
        const html = await response.text();
        if (html.includes('id="sha">Deployed SHA: ' + sha)) return;
        outcome = "different or unverified SHA";
      }
    } catch {
      outcome = "connection unavailable";
    }
    if (redirect) {
      const destination = new URL(redirect, base);
      if (
        destination.origin === "https://app.netlify.com" &&
        destination.pathname === "/edge-access"
      ) {
        throw new Error("NETLIFY_TEAM_PROTECTION: Preview requires an invited Netlify session.");
      }
    }
    if (attempt < 11) await delay(7_500);
  }
  throw new Error("Exact Netlify STAGING Preview unavailable: " + outcome);
}

async function waitForFeed(page) {
  await page.locator(feedResult).first().waitFor();
  assert.equal(await page.getByText("Не удалось загрузить отчёты.", { exact: true }).count(), 0);
}

async function failAfterLoading(page, route, read, loading) {
  let release;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(read, async (request) => {
    await hold;
    await request.abort("failed");
  });
  try {
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await loading.waitFor();
  } finally {
    release();
  }
}

async function checkFeedStates(page, context) {
  const loading = page.getByRole("status").filter({ hasText: "Загружаем отчёты…" });
  await failAfterLoading(page, "/", reportRead, loading);
  await page.getByRole("alert").filter({ hasText: "Не удалось загрузить отчёты." }).waitFor();
  assert.equal(await page.locator(".z-feed-empty").count(), 0, "Error masquerades as empty feed");
  await page.unroute(reportRead);
  await page.getByRole("button", { name: "Попробовать снова", exact: true }).click();
  await waitForFeed(page);

  await context.setOffline(true);
  try {
    await page.getByRole("status").filter({ hasText: "Нет подключения к интернету." }).waitFor();
  } finally {
    await context.setOffline(false);
  }
  await page
    .getByRole("status")
    .filter({ hasText: "Нет подключения к интернету." })
    .waitFor({ state: "hidden" });
}

async function checkSpotStates(page) {
  const atlas = page.locator("#approved-spot-map");
  const loading = atlas.getByText("Проверяем каталог…", { exact: true });
  await failAfterLoading(page, "/competitions", spotRead, loading);
  const alert = atlas
    .getByRole("alert")
    .filter({ hasText: "Не удалось загрузить проверенные споты." });
  await alert.waitFor();
  assert.equal(await atlas.getByText("Проверенных спотов пока нет.", { exact: false }).count(), 0);
  await page.unroute(spotRead);
  const retryRead = page.waitForResponse(
    (response) => spotRead.test(response.url()) && response.ok(),
  );
  await alert.getByRole("button", { name: "Попробовать снова", exact: true }).click();
  await retryRead;
  await loading.waitFor({ state: "hidden" });
  await alert.waitFor({ state: "hidden" });
}

async function run() {
  assert(["netlify", "local-staging"].includes(scope));
  assert.match(sha || "", /^[a-f0-9]{40}$/);
  assert(["chromium", "webkit"].includes(engine));
  if (scope === "netlify") await waitForExactPreview();
  await fs.mkdir(output, { recursive: true });
  const browser = await engines[engine].launch({ headless: true });
  const observations = [];
  const foreignBackend = [];
  let feedReadOk = false;
  try {
    for (const width of [320, 390, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        locale: "ru-RU",
        reducedMotion: "reduce",
      });
      try {
        const page = await context.newPage();
        const errors = [];
        let backend = [];
        await context.route(/\.supabase\.co\//, (route) => {
          const url = new URL(route.request().url());
          if (url.hostname === staging) return route.continue();
          foreignBackend.push(url.hostname);
          return route.abort("blockedbyclient");
        });
        page.on("response", (response) => {
          const url = new URL(response.url());
          if (url.hostname !== staging) return;
          backend.push({ path: url.pathname, status: response.status() });
          if (reportRead.test(response.url()) && response.ok()) feedReadOk = true;
        });
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(base + "/settings", { waitUntil: "domcontentloaded" });
        await page.locator('[data-appearance-ready="true"]').waitFor();
        await page
          .locator('section[aria-labelledby="wallpaper-title"]')
          .getByRole("button", { name: /^Carbon/ })
          .click();
        await page.waitForFunction(
          () => document.documentElement.dataset.zaprudaWallpaper === "carbon",
        );

        for (const screen of screens) {
          backend = [];
          const response = await page.goto(base + screen.route, { waitUntil: "domcontentloaded" });
          assert.ok(response?.ok() && new URL(page.url()).origin === base, screen.name);
          await page.locator("main h1").first().waitFor();
          if (screen.name === "feed") await waitForFeed(page);
          if (screen.name === "communities" && width === 320) {
            const labels = page.locator(".z-country-card > span:nth-child(2)");
            await labels.first().waitFor();
            const wrapped = await labels.evaluateAll((elements) =>
              elements
                .filter((element) => {
                  const range = document.createRange();
                  range.selectNodeContents(element);
                  return range.getClientRects().length > 1;
                })
                .map((element) => element.textContent),
            );
            assert.deepEqual(wrapped, [], "Country names wrap at 320px");
            const search = page.getByRole("searchbox", { name: "Поиск страны" });
            await search.fill("неизвестная страна");
            await page.getByText("Такой страны пока нет в каталоге.", { exact: false }).waitFor();
            await search.clear();
            await labels.first().waitFor();
          }
          if (screen.name === "spot") {
            await page.locator("#approved-spot-map").waitFor();
            await page
              .getByText("Проверяем каталог…", { exact: true })
              .waitFor({ state: "hidden" });
            assert.ok(
              backend.some(
                ({ path, status }) => path === "/rest/v1/zc_public_spots" && status < 300,
              ),
              "No successful approved SPOT catalog read from STAGING",
            );
          }
          if (screen.name === "profile") {
            await page.getByText("Войди, чтобы прокачивать рыболова", { exact: true }).waitFor();
            assert.equal(
              await page.getByRole("group", { name: "Сохранённые способы ловли" }).count(),
              0,
            );
          }
          await assertShellBounds(page);
          await assertMobileNav(page);
          const dimensions = await page.evaluate(() => ({
            viewport: [window.innerWidth, window.innerHeight],
            client: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
            theme: document.documentElement.dataset.zaprudaBackground,
            wallpaper: document.documentElement.dataset.zaprudaWallpaper,
          }));
          assert.deepEqual(dimensions.viewport, [width, 844], screen.name + " viewport");
          assert.ok(dimensions.scroll <= dimensions.client, screen.name + " horizontal scroll");
          assert.equal(dimensions.wallpaper, "carbon");
          observations.push({ ...screen, url: page.url(), ...dimensions, backend });
          if (width === 390)
            await page.screenshot({ path: path.join(output, screen.name + "-390x844.png") });
        }

        for (const [index, route] of mobileRoutes.entries()) {
          const links = await assertMobileNav(page);
          await links.nth(index).click();
          await page.waitForURL((url) => url.origin === base && url.pathname === route);
          await waitForMobileRoute(page, index);
        }
        if (width === 390) {
          await checkFeedStates(page, context);
          await checkSpotStates(page);
        }
        assert.deepEqual(errors, [], engine + " page errors");
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(foreignBackend, [], "Unexpected Supabase origin");
  assert.ok(feedReadOk, "No successful public feed read from STAGING");
  const result = {
    engine,
    sha,
    base,
    scope:
      scope === "netlify"
        ? "Verified Netlify Deploy Preview SHA, live public STAGING reads, guest session"
        : "Exact Git SHA built on Node SSR, live public STAGING reads, guest session",
    faultInjection:
      "Feed and public SPOT reads delayed and aborted for error paths, then retried against STAGING",
    navigation: mobileRoutes,
    observations,
  };
  await fs.writeFile(path.join(output, "summary.json"), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({ sha, engine, base, observations: observations.length, passed: true }),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
