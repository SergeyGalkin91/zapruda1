const assert = require("node:assert/strict");

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

module.exports = { assertShellBounds };
