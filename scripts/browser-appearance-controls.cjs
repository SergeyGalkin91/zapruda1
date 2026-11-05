/** Theme and wallpaper intentionally share a brand name. Always select within the theme region. */
const assert = require("node:assert/strict");
function appThemeButton(page, theme) {
  assert(["classic", "electric-blue"].includes(theme), "Unknown app theme");
  return page
    .locator('section[aria-labelledby="app-background-title"]')
    .getByRole("button", { name: theme === "classic" ? /^Matte Black/ : /^Electric Blue/ });
}
module.exports = { appThemeButton };
