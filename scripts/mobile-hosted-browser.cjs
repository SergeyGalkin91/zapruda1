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
const feedResult = ".z-feed-card, .z-feed-empty, [data-z-screen=feed] main [role=alert]";

async function waitForExactPreview() {
  assert.match(base || "", /^https:\/\/deploy-preview-[1-9][0-9]*--zapruda1\.netlify\.app$/);
  let outcome = "pending";
  for (let attempt = 0; attempt < 48; attempt += 1) {
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
    if (attempt < 47) await delay(7_500);
  }
  throw new Error("Exact Netlify STAGING Preview unavailable: " + outcome);
}

async function waitForFeed(page) {
  await page.locator(feedResult).first().waitFor();
  assert.equal(await page.getByText("Не удалось загрузить отчёты.", { exact: true }).count(), 0);
}

async function checkFeedStates(page, context) {
  let release;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(reportRead, async (route) => {
    await hold;
    await route.abort("failed");
  });
  try {
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.getByRole("status").filter({ hasText: "Загружаем отчёты…" }).waitFor();
  } finally {
    release();
  }
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
        if (width === 390) await checkFeedStates(page, context);
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
      "Report read delayed and aborted for the error path, then retried against STAGING",
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
