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
  scope === "local-staging" ? "https://127.0.0.1:3000" : process.env.NETLIFY_MOBILE_PREVIEW;
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
    if (outcome === "HTTP 401") {
      throw new Error(
        "NETLIFY_TEAM_PROTECTION: Preview requires an invited Netlify session (401).",
      );
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

async function mapFrameState(page) {
  const embed = page.locator("#approved-spot-map iframe");
  assert.equal(new URL(await embed.getAttribute("src")).origin, "https://yandex.ru");
  const isMap = (frame) => frame.url().startsWith("https://yandex.ru/map-widget/v1/");
  try {
    const frame =
      page.frames().find(isMap) ??
      (await page.waitForEvent("framenavigated", { predicate: isMap, timeout: 6_000 }));
    await frame.waitForLoadState("load", { timeout: 6_000 });
    return "loaded";
  } catch (error) {
    if (!(error instanceof engines.errors.TimeoutError)) throw error;
    return "provider pending";
  }
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
  const mapFrameAccessWarnings = [];
  let feedReadOk = false;
  try {
    for (const width of [320, 390, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        // The CI server uses an ephemeral loopback certificate. Hosted TLS stays verified.
        ignoreHTTPSErrors: scope === "local-staging",
        locale: "ru-RU",
        reducedMotion: "reduce",
      });
      try {
        const errors = [];
        await context.route(/\.supabase\.co\//, (route) => {
          const url = new URL(route.request().url());
          if (url.hostname === staging) return route.continue();
          foreignBackend.push(url.hostname);
          return route.abort("blockedbyclient");
        });
        context.on("weberror", (event) => {
          const error = event.error();
          if (
            engine === "webkit" &&
            error.message.includes('/yandex.ru"') &&
            error.message.includes('from accessing a frame with origin "' + base + '"')
          ) {
            mapFrameAccessWarnings.push({ width, message: error.message.trim() });
          } else {
            errors.push(error.message);
          }
        });
        const settings = await context.newPage();
        await settings.goto(base + "/settings", { waitUntil: "domcontentloaded" });
        await settings.locator('[data-appearance-ready="true"]').waitFor();
        await settings
          .locator('section[aria-labelledby="wallpaper-title"]')
          .getByRole("button", { name: /^Carbon/ })
          .click();
        await settings.waitForFunction(
          () => document.documentElement.dataset.zaprudaWallpaper === "carbon",
        );
        await settings.close();

        for (const screen of screens) {
          const page = await context.newPage();
          const backend = [];
          page.on("response", (response) => {
            const url = new URL(response.url());
            if (url.hostname !== staging) return;
            backend.push({ path: url.pathname, status: response.status() });
            if (reportRead.test(response.url()) && response.ok()) feedReadOk = true;
          });
          let mapFrame;
          const response = await page.goto(base + screen.route, { waitUntil: "domcontentloaded" });
          assert.ok(response?.ok(), screen.name + " response");
          assert.equal(page.url(), base + screen.route, screen.name + " URL");
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
            await page.getByRole("link", { name: "войди в аккаунт", exact: true }).waitFor();
            assert.ok(!backend.some(({ path }) => path === "/rest/v1/competitions"));
            if (width === 390) mapFrame = await mapFrameState(page);
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
          observations.push({ ...screen, url: page.url(), ...dimensions, backend, mapFrame });
          if (width === 390)
            await page.screenshot({ path: path.join(output, screen.name + "-390x844.png") });
          await page.close();
        }

        const page = await context.newPage();
        await page.goto(base + "/welcome", { waitUntil: "domcontentloaded" });
        for (const [index, route] of mobileRoutes.entries()) {
          const links = await assertMobileNav(page);
          await links.nth(index).click();
          await page.waitForURL((url) => url.origin === base && url.pathname === route);
          await waitForMobileRoute(page, index);
        }
        await page.close();
        if (width === 390) {
          const feed = await context.newPage();
          await checkFeedStates(feed, context);
          await feed.close();
          const spot = await context.newPage();
          await checkSpotStates(spot);
          await spot.close();
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
        : "Exact Git SHA built on HTTPS loopback Node SSR, live public STAGING reads, guest session",
    faultInjection:
      "Feed and public SPOT reads delayed and aborted for error paths, then retried against STAGING",
    navigation: mobileRoutes,
    mapFrameAccessWarnings,
    observations,
  };
  await fs.writeFile(path.join(output, "summary.json"), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      sha,
      engine,
      base,
      observations: observations.length,
      mapFrameAccessWarnings: mapFrameAccessWarnings.length,
      passed: true,
    }),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
