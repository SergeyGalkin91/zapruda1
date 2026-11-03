/**
 * Issue #76 regression: Electric Blue must not inherit matte-black green
 * surfaces. No authenticated calls: Supabase placeholder responses are stubbed.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

const server = process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = process.env.VISUAL_OUTPUT_DIR || "appearance-evidence";
fs.mkdirSync(artifactDir, { recursive: true });

const forbidden = [
  "#0D100C",
  "#171C14",
  "#080A09",
  "#0B0D0B",
  "#121A12",
  "#141914",
  "#151812",
  "#171a15",
  "#0E120F",
  "#0C100E",
  "#1A1D19",
  "#111511",
  "#1A2016",
  "#151915",
  "#0E120E",
  "#151A14",
  "#161D13",
  "#111610",
  "#1B2718",
  "#1E251A",
  "#27321b",
  "#10150E",
  "#101310",
  "#070908",
  "#171d13",
  "#151811",
];
const rgb = (hex) => {
  const raw = hex.slice(1);
  return [0, 2, 4].map((offset) => parseInt(raw.slice(offset, offset + 2), 16));
};
const forbiddenRgb = forbidden.map((hex) => {
  const [r, g, b] = rgb(hex);
  return "rgb(" + r + ", " + g + ", " + b + ")";
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        locale: "ru-RU",
        reducedMotion: "reduce",
      });
      await context.addInitScript(() => {
        localStorage.setItem(
          "zapruda.appearance.v1",
          JSON.stringify({ background: "electric-blue", chat: "plain" }),
        );
      });
      await context.route("https://ci-placeholder.supabase.co/**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: "[]",
        });
      });

      for (const route of ["/settings", "/", "/communities", "/partners", "/chat", "/profile"]) {
        const page = await context.newPage();
        const response = await page.goto(server + route, { waitUntil: "domcontentloaded" });
        assert(response && response.status() < 400, "route request failed: " + route);
        await page.waitForFunction(
          () => document.documentElement.dataset.zaprudaBackground === "electric-blue",
          { timeout: 12000 },
        );
        await page.waitForTimeout(300);
        const audit = await page.evaluate((colors) => {
          const matches = [];
          for (const element of document.querySelectorAll("header, nav, main, main *")) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = getComputedStyle(element);
            const solid = style.backgroundColor;
            const gradient = style.backgroundImage;
            const hasForbiddenSolid = colors.includes(solid);
            const hasForbiddenGradient = colors.some((color) => gradient.includes(color));
            if (hasForbiddenSolid || hasForbiddenGradient) {
              matches.push({
                tag: element.tagName,
                className:
                  typeof element.className === "string"
                    ? element.className.slice(0, 160)
                    : "",
                solid,
                gradient: gradient.slice(0, 200),
              });
            }
          }
          const header = getComputedStyle(document.querySelector("header.sticky"));
          return {
            matches: matches.slice(0, 20),
            matchCount: matches.length,
            header: header.backgroundColor,
            overflow: document.documentElement.scrollWidth > innerWidth + 2,
          };
        }, forbiddenRgb);
        if (audit.matchCount) console.error(width, route, JSON.stringify(audit.matches));
        assert.equal(
          audit.matchCount,
          0,
          width + " " + route + ": green matte surfaces in Electric Blue",
        );
        assert.equal(audit.overflow, false, width + " " + route + ": horizontal overflow");
        if (["/settings", "/"].includes(route)) {
          await page.screenshot({
            path:
              artifactDir +
              "/no-green-" +
              width +
              "-" +
              (route === "/" ? "feed" : "settings") +
              ".png",
            fullPage: false,
          });
        }
        console.log("PASS no-green", width, route);
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
