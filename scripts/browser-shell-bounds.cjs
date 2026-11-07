const assert = require("node:assert/strict");
const mobileRoutes = ["/", "/communities", "/reports/new", "/partners", "/chat"];
const mobileScreens = ["feed", "communities", "create", "trips", "chat"];

/** Check essential controls themselves: overflow-x:clip can conceal a broken header. */
async function assertShellBounds(page) {
  const metrics = await page.evaluate(() => {
    const toggle = document.querySelector('summary[aria-controls="zapruda-extra-nav"]');
    const header = toggle?.closest("header");
    if (!header) return { missingHeader: true };
    const viewport = document.documentElement.clientWidth;
    const controls = Array.from(header.querySelectorAll("a,summary"))
      .filter((el) => {
        const box = el.getBoundingClientRect();
        const hiddenDetails = el.closest("details:not([open])");
        return (
          box.width > 0 &&
          box.height > 0 &&
          getComputedStyle(el).visibility !== "hidden" &&
          (!hiddenDetails || el.tagName === "SUMMARY")
        );
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          label: el.getAttribute("aria-label") || el.textContent.trim(),
          left: r.left,
          right: r.right,
          width: r.width,
          height: r.height,
          essential:
            el === toggle ||
            el.getAttribute("href") === "/profile" ||
            el.getAttribute("href")?.startsWith("/auth"),
        };
      });
    return { viewport, controls };
  });
  assert(!metrics.missingHeader, "SHELL_HEADER_MISSING");
  assert.deepEqual(
    metrics.controls.filter((c) => c.left < -1 || c.right > metrics.viewport + 1),
    [],
    "SHELL_CONTROL_CLIPPED: " + JSON.stringify(metrics),
  );
  assert.deepEqual(
    metrics.controls.filter((c) => c.essential && (c.width < 43.5 || c.height < 43.5)),
    [],
    "SHELL_CONTROL_TAP_TARGET: " + JSON.stringify(metrics),
  );
  return metrics;
}

async function assertMobileNav(page) {
  const nav = page.getByRole("navigation", { name: "Мобильная навигация" });
  const links = nav.locator("a");
  // A client route or the initial session event can remount Shell during navigation.
  // Query and measure the live links in the same browser frame.
  const measurement = await page.waitForFunction(
    (expectedLinks) => {
      const boxes = Array.from(document.querySelectorAll(".z-mobile-nav-items a"), (element) => {
        const box = element.getBoundingClientRect();
        const atCenter = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return {
          route: element.getAttribute("href")?.split("?")[0],
          width: box.width,
          height: box.height,
          reachable: element.contains(atCenter),
        };
      });
      return boxes.length === expectedLinks && boxes.every(({ width, height }) => width && height)
        ? boxes
        : false;
    },
    mobileRoutes.length,
    { timeout: 8_000 },
  );
  const boxes = await measurement.jsonValue();
  await measurement.dispose();
  assert.deepEqual(
    boxes.map(({ route }) => route),
    mobileRoutes,
  );
  assert.ok(
    boxes.every((box) => box.width >= 43.5 && box.height >= 43.5 && box.reachable),
    "A mobile nav target is too small or covered: " + JSON.stringify(boxes),
  );
  return links;
}

async function waitForMobileRoute(page, index) {
  const shell = page.locator('[data-z-screen="' + mobileScreens[index] + '"]');
  const links = shell.locator(".z-mobile-nav-items a");
  await links.nth(index).and(shell.locator('a[aria-current="page"]')).waitFor();
}

module.exports = { assertShellBounds, assertMobileNav, waitForMobileRoute, mobileRoutes };
