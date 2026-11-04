/* eslint-disable prettier/prettier -- Existing browser smoke fixture; checked by executed cross-browser workflow. */
/**
 * Browser-level, read-only appearance acceptance for #76.
 * Uses a CI Supabase placeholder: never logs in, writes data or calls production endpoints.
 * Requires a locally started Nitro app and Playwright browsers.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, webkit, firefox } = require("playwright");
const { assertShellBounds } = require("./browser-shell-bounds.cjs");
const ENGINE = process.env.VISUAL_BROWSER || "chromium";
const ENGINES = { chromium, webkit, firefox };
assert(ENGINE in ENGINES, "Unsupported VISUAL_BROWSER: " + ENGINE);

const BASE = process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.env.VISUAL_OUTPUT_DIR || "appearance-evidence");
fs.mkdirSync(OUT, { recursive: true });

const COLORS = Object.freeze({
  matte: "#0b0d0e",
  blue: "#1239a6",
  blueHighlight: "#1458db",
  lime: "#d7ff35",
  eggplant: "#614051",
  eggplantText: "#f9ecf7",
  lavender: "#a99ad9",
});

function hexToRgb(hex) {
  const raw = hex.replace(/^#/, "");
  return [0, 2, 4].map((start) => parseInt(raw.slice(start, start + 2), 16) / 255);
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((x) => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const paletteRatios = {
  limeOnBrightBlue: contrast(COLORS.lime, COLORS.blueHighlight),
  limeOnBlue: contrast(COLORS.lime, COLORS.blue),
  lightOnEggplant: contrast(COLORS.eggplantText, COLORS.eggplant),
};
for (const [name, ratio] of Object.entries(paletteRatios)) {
  assert(ratio >= 4.5, name + " ratio " + ratio.toFixed(2) + " < 4.5");
}

function fileFor(viewport, name) {
  return path.join(OUT, ENGINE + "-" + viewport + "-" + name + ".png");
}
async function variables(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const css = getComputedStyle(root);
    const body = getComputedStyle(document.body);
    return {
      theme: root.dataset.zaprudaBackground,
      background: css.getPropertyValue("--background").trim().toLowerCase(),
      primary: css.getPropertyValue("--primary").trim().toLowerCase(),
      undergroundViolet: css.getPropertyValue("--z-violet").trim().toLowerCase(),
      bodyBackground: body.backgroundImage,
      horizontalOverflow: root.scrollWidth > root.clientWidth + 2,
      routeError: document.body.textContent?.includes("This page didn't load") ?? false,
    };
  });
}
async function assertNoOliveSurfaces(page, route) {
  const issues = await page.evaluate(() => {
    const bannedHex = [
      "#0D100C", "#171C14", "#080A09", "#0B0D0B", "#121A12",
      "#141914", "#151915", "#0C100E", "#111511", "#151A14",
      "#0E120E", "#151812", "#171a15", "#161D13", "#1A1D19",
      "#1B2718", "#1E251A", "#27321b", "#283721", "#101713",
    ];
    const rgb = (hex) => {
      const v = hex.slice(1);
      return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
    };
    const bannedRgb = new Set(bannedHex.map((hex) => {
      const values = rgb(hex);
      return "rgb(" + values.join(", ") + ")";
    }));
    const failures = [];
    for (const el of document.querySelectorAll("body *")) {
      if (failures.length >= 12) break;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const style = getComputedStyle(el);
      if (bannedRgb.has(style.backgroundColor)) {
        failures.push({ tag: el.tagName, className: String(el.className).slice(0, 100), color: style.backgroundColor });
      }
      const gradientColors = style.backgroundImage.match(/rgb\(\d+,\s*\d+,\s*\d+\)/g) || [];
      if (gradientColors.some((color) => bannedRgb.has(color.replace(/,\s*/g, ", ")))) {
        failures.push({ tag: el.tagName, className: String(el.className).slice(0, 100), gradient: style.backgroundImage });
      }
    }
    return failures;
  });
  assert.deepEqual(issues, [], route + ": legacy green surface leaked into Electric Blue");
}
async function openRoute(page, route) {
  const response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert(response && response.status() >= 200 && response.status() < 400,
    route + ": unexpected response " + response?.status());
  await page.locator("main").first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => Boolean(document.documentElement.dataset.zaprudaBackground), { timeout: 15000 });
  await page.waitForTimeout(500); // capture after client hydration and responsive layout
  const actual = await variables(page);
  assert(!actual.routeError, route + ": React route error screen");
  assert(!actual.horizontalOverflow, route + ": horizontal overflow");
  await assertShellBounds(page);
  return actual;
}

(async () => {
  const browser = await ENGINES[ENGINE].launch({ headless: true });
  const evidence = {
    runAt: new Date().toISOString(),
    browser: ENGINE,
    paletteRatios,
    viewports: [],
  };
  try {
    for (const viewport of [
      { label: "mobile-320", width: 320, height: 740, mobile: true },
      { label: "mobile-390", width: 390, height: 844, mobile: true },
      { label: "tablet-768", width: 768, height: 1024, mobile: false },
      { label: "desktop-1440", width: 1440, height: 900, mobile: false },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.mobile && ENGINE !== "firefox",
        hasTouch: viewport.mobile,
        deviceScaleFactor: 1,
        locale: "ru-RU",
        reducedMotion: "reduce",
      });
      // Stub only the isolated CI placeholder host. Real app behavior/DOM and
      // theme state still run in-browser; cross-origin network is not under test.
      // Without this WebKit logs unhandled CORS errors for the intentionally
      // non-existent host, which are unrelated to appearance regressions.
      await context.route("https://ci-placeholder.supabase.co/**", async (route) => {
        const url = new URL(route.request().url());
        await route.fulfill({
          status: url.pathname.startsWith("/auth/") ? 401 : 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: url.pathname.startsWith("/auth/")
            ? JSON.stringify({ message: "No test session", code: "not_authenticated" })
            : "[]",
        });
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on("pageerror", (e) => runtimeErrors.push(e.message));
      try {
        const before = await openRoute(page, "/settings");
        assert.equal(before.theme, "classic", "Matte Black must remain default");
        assert.equal(before.primary, COLORS.lime);
        assert.equal(before.undergroundViolet, "#b4a1d7", "Default visual tokens must not change");
        const black = page.getByRole("button", { name: /Matte Black/ }).first();
        const blue = page.getByRole("button", { name: /Electric Blue/ }).first();
        assert(await black.isVisible(), "Matte Black selector missing");
        assert(await blue.isVisible(), "Electric Blue selector missing");
        assert.equal(await black.getAttribute("aria-pressed"), "true", "Matte default not selected");
        await page.screenshot({ path: fileFor(viewport.label, "settings-matte"), fullPage: false });

        await blue.click();
        await page.waitForFunction(() => document.documentElement.dataset.zaprudaBackground === "electric-blue");
        // The pre-paint attribute can precede the rendered panel's final style.
        // Wait for the same exact approved color asserted below, not a timeout
        // or a relaxed color range. A real palette regression still fails.
        await page.waitForFunction(() => {
          const panel = document.querySelector('section[aria-labelledby="app-background-title"]');
          return panel && getComputedStyle(panel).backgroundColor === "rgb(26, 54, 127)";
        });
        const after = await variables(page);
        assert.equal(after.background, COLORS.blue);
        assert.equal(after.primary, COLORS.lime);
        assert.equal(after.undergroundViolet, COLORS.eggplant);
        assert(after.bodyBackground.includes("radial-gradient"), "Electric Blue gradient did not apply");
        await assertNoOliveSurfaces(page, "/settings");
        const settingsSurfaces = await page.evaluate(() => ({
          panel: getComputedStyle(document.querySelector('section[aria-labelledby="app-background-title"]')).backgroundColor,
          headerGradient: getComputedStyle(document.querySelector("main header")).backgroundImage,
        }));
        assert.equal(settingsSurfaces.panel, "rgb(26, 54, 127)", "Settings panel must retain the approved Electric Blue fill");
        assert(
          settingsSurfaces.headerGradient.includes("32, 82, 187") ||
            settingsSurfaces.headerGradient.includes("32,82,187"),
          "Settings hero kept its old olive gradient",
        );
        assert.equal(await blue.getAttribute("aria-pressed"), "true");
        // Fixed backgrounds render correctly while scrolling; Chromium fullPage
        // screenshots falsely show white after the first viewport. Capture both
        // real viewport positions instead of stitching a full-page image.
        await page.screenshot({ path: fileFor(viewport.label, "settings-electric-blue"), fullPage: false });
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(250);
        assert.equal((await variables(page)).background, COLORS.blue);
        await page.screenshot({ path: fileFor(viewport.label, "settings-electric-blue-bottom"), fullPage: false });
        await page.evaluate(() => window.scrollTo(0, 0));

        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.documentElement.dataset.zaprudaBackground === "electric-blue");
        const persisted = await variables(page);
        assert.equal(persisted.background, COLORS.blue, "Blue preference lost after reload");
        assert.equal(await page.getByRole("button", {name:/Electric Blue/}).first().getAttribute("aria-pressed"), "true");

        const routes = ["/", "/communities", "/partners", "/chat", "/profile", "/assistant", "/reports/new", "/street", "/competitions", "/messages"];
        const checks = [];
        for (const route of routes) {
          const actual = await openRoute(page, route);
          assert.equal(actual.theme, "electric-blue", route + ": preference lost during navigation");
          assert.equal(actual.background, COLORS.blue, route + ": blue CSS token missing");
          await assertNoOliveSurfaces(page, route);
          if (route === "/") {
            const feedSurface = await page.evaluate(() => {
              const hero = document.querySelector(".z-feed-intro");
              const street = document.querySelector('main a[href="/street"]');
              const helpCard = document.querySelector('main a[href="/assistant"]');
              if (!hero || !street || !helpCard) throw new Error("Feed structure changed");
              return {
                hero: getComputedStyle(hero).backgroundColor,
                street: getComputedStyle(street).backgroundColor,
                helpCard: getComputedStyle(helpCard).backgroundColor,
              };
            });
            assert.equal(feedSurface.hero, "rgba(0, 0, 0, 0)", "Feed heading should not become an oversized filled hero");
            assert.equal(feedSurface.street, "rgb(20, 45, 107)", "Street card retained dark green");
            assert.equal(feedSurface.helpCard, "rgb(20, 45, 107)", "Lime-tinted card looked olive");
          }
          if (route === "/street") {
            const hero = await page.locator(".z-electric-street-hero").evaluate((el) => ({
              color: getComputedStyle(el).backgroundColor,
              image: getComputedStyle(el).backgroundImage,
            }));
            assert.equal(hero.color, "rgb(25, 62, 150)", "STREET hero retained a matte/olive surface");
            assert(hero.image.replaceAll(" ", "").includes("32,82,187"), "STREET blue gradient missing");
          }
          checks.push({ route, background: actual.background, overflow: actual.horizontalOverflow });
          if (["/assistant", "/reports/new", "/street", "/competitions"].includes(route)) {
            await page.screenshot({ path: fileFor(viewport.label, route.slice(1).replaceAll("/", "-") + "-electric-blue"), fullPage: true });
          }
          if (route === "/" || route === "/chat") {
            await page.screenshot({
              path: fileFor(viewport.label, route === "/" ? "feed-electric-blue" : "chat-electric-blue"),
              fullPage: false,
            });
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.waitForTimeout(250);
            assert.equal((await variables(page)).background, COLORS.blue);
            await page.screenshot({
              path: fileFor(viewport.label, route === "/" ? "feed-electric-blue-bottom" : "chat-electric-blue-bottom"),
              fullPage: false,
            });
          }
        }

        await openRoute(page, "/settings");
        await page.getByRole("button", {name:/Matte Black/}).first().click();
        await page.waitForFunction(() => document.documentElement.dataset.zaprudaBackground === "classic");
        const restored = await variables(page);
        assert.equal(restored.background, COLORS.matte);
        assert.equal(await page.getByRole("button", {name:/Matte Black/}).first().getAttribute("aria-pressed"), "true");
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.documentElement.dataset.zaprudaBackground === "classic");
        assert.equal((await variables(page)).background, COLORS.matte, "Matte preference lost after reload");
        const matteChecks = [];
        for (const route of routes) {
          const actual = await openRoute(page, route);
          assert.equal(actual.theme, "classic", route + ": matte preference lost");
          assert.equal(actual.background, COLORS.matte, route + ": matte background changed");
          await page.screenshot({ path: fileFor(viewport.label, (route === "/" ? "feed" : route.slice(1).replaceAll("/", "-")) + "-matte"), fullPage: route === "/reports/new" });
          matteChecks.push({ route, overflow: actual.horizontalOverflow });
        }
        assert.deepEqual(runtimeErrors, [], "Browser JS errors: " + runtimeErrors.join(" | "));
        evidence.viewports.push({
          viewport: viewport.label,
          blackDefault: before,
          blueApplied: after,
          bluePersistedAfterReload: persisted.theme,
          matteRestored: restored.theme,
          routes: checks,
          matteRoutes: matteChecks,
          browserErrors: runtimeErrors,
        });
        console.log(
          "PASS appearance browser:",
          ENGINE,
          "viewport:",
          viewport.label,
          "routes",
          checks.length,
        );
      } finally {
        await page.close();
        await context.close();
      }
    }
    console.log("PASS palette ratios:", JSON.stringify(paletteRatios));
    console.log("PASS all browser appearance checks:", ENGINE);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, ENGINE + "-results.json"), JSON.stringify(evidence, null, 2));
  }
})().catch((error) => {
  console.error("VISUAL APPEARANCE FAILURE:", error);
  process.exitCode = 1;
});
