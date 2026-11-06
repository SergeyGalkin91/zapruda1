const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const playwright = require("playwright");

const engine = process.env.VISUAL_BROWSER || "chromium";
const origin = "http://127.0.0.1:3000";
const sizes = [
  [320, 568],
  [360, 800],
  [375, 812],
  [390, 844],
  [414, 896],
  [430, 932],
];
const evidence = "appearance-evidence/mobile-forms";

async function hasNoHorizontalOverflow(page) {
  const dims = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  assert.ok(dims.scroll <= dims.viewport, JSON.stringify(dims));
}

async function checkLabel(page, name, lifted) {
  // The root auth boundary can replace the server-rendered field during hydration.
  const actual = await page.waitForFunction(
    ({ name, lifted }) => {
      const input = document.querySelector("input[name=" + name + "]");
      const label = input?.labels?.[0];
      if (!label) return false;
      const style = getComputedStyle(label);
      if (style.position !== "absolute") return false;
      const top = parseFloat(style.top);
      return Number.isFinite(top) && top < 12 === lifted;
    },
    { name, lifted },
  );
  await actual.dispose();
}

async function run() {
  await fs.mkdir(evidence, { recursive: true });
  const browser = await playwright[engine].launch();
  try {
    for (const [width, height] of sizes) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
        ...(engine === "firefox" ? {} : { isMobile: true, hasTouch: true }),
      });
      try {
        await context.route("https://ci-placeholder.supabase.co/**", (route) =>
          route.fulfill({ json: [], headers: { "access-control-allow-origin": "*" } }),
        );
        const page = await context.newPage();
        await page.goto(origin + "/auth?mode=up", { waitUntil: "load" });
        const username = page.getByRole("textbox", { name: "Никнейм" });
        const email = page.getByRole("textbox", { name: "Email" });
        await checkLabel(page, "email", false);
        await email.focus();
        await checkLabel(page, "email", true);
        await email.fill("mobile-qa@example.test");
        await username.fill("!!!!");
        await checkLabel(page, "email", true);
        await page.locator("input[name=password]").fill("isolated-qa-value");
        await page.getByRole("button", { name: /Зарегистрироваться/ }).click();
        await page.getByRole("alert").filter({ hasText: "3–24 символа" }).waitFor();
        assert.equal(await username.getAttribute("aria-invalid"), "true");
        assert.equal(await email.inputValue(), "mobile-qa@example.test");
        await hasNoHorizontalOverflow(page);

        if (width !== 390) continue;
        await page.screenshot({ path: evidence + "/" + engine + "-registration-validation.png" });

        await page.evaluate(() => {
          const viewport = window.visualViewport;
          if (!viewport) throw new Error("VisualViewport missing");
          Object.defineProperties(viewport, {
            height: { configurable: true, value: window.innerHeight - 280 },
            offsetTop: { configurable: true, value: 0 },
          });
          viewport.dispatchEvent(new Event("resize"));
        });
        await page.locator('[data-z-keyboard-open="true"]').waitFor();
        assert.equal(await username.evaluate((field) => field === document.activeElement), true);
        try {
          await page.waitForFunction(
            () => {
              const shell = document.querySelector(".z-app-shell");
              const bar = shell?.querySelector(".z-sticky-form-actions");
              return bar && getComputedStyle(bar).bottom === "280px";
            },
            undefined,
            { timeout: 4_000 },
          );
        } catch {
          const geometry = await page.locator(".z-sticky-form-actions").evaluate((bar) => {
            const shell = bar.closest(".z-app-shell");
            return {
              bottom: getComputedStyle(bar).bottom,
              keyboard: shell.dataset.zKeyboardOpen,
              cssInset: getComputedStyle(bar).getPropertyValue("--z-form-bottom"),
              height: window.visualViewport.height,
              offsetTop: window.visualViewport.offsetTop,
              innerHeight: window.innerHeight,
              inline: shell.style.getPropertyValue("--z-form-bottom"),
            };
          });
          assert.fail("Keyboard action bar: " + JSON.stringify(geometry));
        }
        await page.evaluate(() => {
          delete window.visualViewport.height;
          delete window.visualViewport.offsetTop;
          window.visualViewport.dispatchEvent(new Event("resize"));
        });
        await page.locator('[data-z-keyboard-open="true"]').waitFor({ state: "detached" });

        await page.goto(origin + "/reports/new", { waitUntil: "domcontentloaded" });
        const title = page.getByLabel(/Название отчёта/);
        await title.fill("Мобильный черновик");
        await page.getByLabel(/Вид рыбалки для достижений/).selectOption({ index: 1 });
        await page.getByRole("button", { name: "Далее", exact: true }).click();
        await page.getByRole("button", { name: "+ Рыба" }).click();
        await page.getByLabel("Вид рыбы", { exact: true }).fill("Окунь");
        await page.getByLabel("Вес, кг", { exact: true }).fill("0.4");
        await page.getByRole("button", { name: "Назад", exact: true }).click();
        assert.equal(await title.inputValue(), "Мобильный черновик");
        await page.getByRole("button", { name: "Далее", exact: true }).click();
        assert.equal(await page.getByLabel("Вид рыбы", { exact: true }).inputValue(), "Окунь");
        await hasNoHorizontalOverflow(page);
        await page.screenshot({ path: evidence + "/" + engine + "-report-catch.png" });
      } finally {
        await context.close();
      }
    }
    console.log(
      JSON.stringify({
        engine,
        sizes,
        scope: "isolated forms and simulated viewport",
        passed: true,
      }),
    );
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
