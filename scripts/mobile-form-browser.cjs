const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const playwright = require("playwright");
const { expect } = require("playwright/test");

const engine = process.env.VISUAL_BROWSER || "chromium";
const origin = "http://127.0.0.1:3000";
const fixtureHost = "ci-placeholder.supabase.co";
const sizes = [
  [320, 568],
  [360, 800],
  [375, 812],
  [390, 844],
  [414, 896],
  [430, 932],
];
const evidence = "appearance-evidence/mobile-forms";
const user = {
  id: "00000000-0000-4000-8000-000000000117",
  aud: "authenticated",
  role: "authenticated",
  email: "mobile-qa@example.test",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
  is_anonymous: false,
};

async function interceptLocalBackend(context) {
  // The app points at an isolated placeholder. All Supabase traffic is intercepted
  // and this fixture token must never be forwarded to a remote service.
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token =
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({ sub: user.id, role: user.role, exp: expiresAt }) +
    ".offline-invalid-signature";
  await context.addInitScript(
    ({ origin, user, token, expiresAt }) => {
      if (
        location.origin !== origin ||
        !["/profile", "/reports/new", "/communities"].includes(location.pathname)
      )
        return;
      localStorage.setItem(
        "sb-ci-placeholder-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "isolated-ui-fixture",
          token_type: "bearer",
          expires_at: expiresAt,
          expires_in: 3600,
          user,
        }),
      );
    },
    { origin, user, token, expiresAt },
  );
  const failedWrites = [];
  await context.route("https://**.supabase.co/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== fixtureHost) throw new Error("Unexpected Supabase host: " + url.hostname);
    const method = request.method();
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, HEAD, POST, PATCH, OPTIONS",
      "access-control-allow-headers": request.headers()["access-control-request-headers"] ?? "*",
    };
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (
      (method === "POST" &&
        ["/auth/v1/signup", "/rest/v1/rpc/publish_report_with_catches"].includes(url.pathname)) ||
      (method === "PATCH" && url.pathname === "/rest/v1/profiles")
    ) {
      failedWrites.push(url.pathname);
      return route.abort("failed");
    }
    if (url.pathname === "/auth/v1/user") return route.fulfill({ json: user, headers });
    if (url.pathname === "/rest/v1/rpc/my_profile_full") {
      return route.fulfill({
        json: [
          {
            username: "mobile_qa",
            display_name: "QA профиль",
            bio: "",
            avatar_url: null,
            chat_city: null,
          },
        ],
        headers,
      });
    }
    return route.fulfill({ json: [], headers });
  });
  return failedWrites;
}

async function assertAction(button, inset = 0) {
  await button.scrollIntoViewIfNeeded();
  const dims = await button.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const visibleHeight = window.innerHeight;
    const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: document.documentElement.clientWidth,
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      height: box.height,
      width: box.width,
      visibleHeight,
      hit: target === element || element.contains(target),
    };
  });
  const message = JSON.stringify({ engine, inset, ...dims });
  assert.ok(dims.overflow <= 1 && dims.left >= -1 && dims.right <= dims.viewport + 1, message);
  assert.ok(dims.width >= 44 && dims.height >= 44 && dims.hit, message);
  assert.ok(dims.top >= -1 && dims.bottom <= dims.visibleHeight - inset + 1, message);
  await button.click({ trial: true });
}

async function simulateKeyboard(page, field, button) {
  await field.focus();
  await expect(field).toBeFocused();
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    if (!viewport) throw new Error("VisualViewport missing");
    Object.defineProperties(viewport, {
      height: { configurable: true, value: window.innerHeight - 280 },
      offsetTop: { configurable: true, value: 0 },
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(() =>
      button.evaluate(
        (element) => getComputedStyle(element.closest(".z-sticky-form-actions")).bottom,
      ),
    )
    .toBe("280px");
  await expect(field).toBeFocused();
  await assertAction(button, 280);
  await expect(field).toBeFocused();
}

async function resetKeyboard(page) {
  await page.evaluate(() => {
    delete window.visualViewport.height;
    delete window.visualViewport.offsetTop;
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await page.locator('[data-z-keyboard-open="true"]').waitFor({ state: "detached" });
}

async function checkLabel(page, lifted) {
  await page.waitForFunction((lifted) => {
    const label = document.querySelector("input[name=email]")?.labels?.[0];
    if (!label) return false;
    const style = getComputedStyle(label);
    const top = parseFloat(style.top);
    return style.position === "absolute" && Number.isFinite(top) && top < 12 === lifted;
  }, lifted);
}

async function registration(page, width, writes) {
  await page.goto(origin + "/auth?mode=up", { waitUntil: "load" });
  const username = page.getByRole("textbox", { name: "Никнейм" });
  const email = page.getByRole("textbox", { name: "Email" });
  const password = page.locator("input[name=password]");
  const submit = page.getByRole("button", { name: /Зарегистрироваться/ });
  await checkLabel(page, false);
  await email.focus();
  await checkLabel(page, true);
  await email.fill(user.email);
  await username.fill("!!!!");
  await checkLabel(page, true);
  await password.fill("isolated-qa-value");
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: "3–24 символа" })).toBeVisible();
  await expect(username).toHaveAttribute("aria-invalid", "true");
  if (width === 390)
    await page.screenshot({ path: evidence + "/" + engine + "-registration-validation.png" });
  await username.fill("mobile_qa");
  await simulateKeyboard(page, email, submit);
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: /Проверь подключение/ })).toBeVisible();
  assert.ok(writes.includes("/auth/v1/signup"));
  await resetKeyboard(page);
  await expect(username).toHaveValue("mobile_qa");
  await expect(email).toHaveValue(user.email);
  await expect(password).toHaveValue("isolated-qa-value");
}

async function profile(page, width, writes) {
  await page.goto(origin + "/profile", { waitUntil: "load" });
  await page.getByRole("link", { name: "Редактировать профиль", exact: true }).click();
  const sections = page.getByRole("group", { name: "Разделы редактирования" });
  const name = page.getByLabel("Отображаемое имя", { exact: true });
  const city = page.getByLabel("Город рыбалки", { exact: true });
  const save = page.getByRole("button", { name: "Сохранить редактирование профиля" });
  await name.fill("Мобильный профиль");
  await sections.getByRole("button", { name: "Рыбалка", exact: true }).click();
  await city.fill("Тестовый город");
  await sections.getByRole("button", { name: "Личные данные", exact: true }).click();
  await expect(name).toHaveValue("Мобильный профиль");
  await simulateKeyboard(page, name, save);
  if (width === 390) await page.screenshot({ path: evidence + "/" + engine + "-profile-edit.png" });
  await save.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Не удалось сохранить имя и описание" }),
  ).toBeVisible();
  assert.ok(writes.includes("/rest/v1/profiles"));
  await resetKeyboard(page);
  await expect(name).toHaveValue("Мобильный профиль");
  await sections.getByRole("button", { name: "Рыбалка", exact: true }).click();
  await expect(city).toHaveValue("Тестовый город");
  await sections.getByRole("button", { name: "Приватность", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Показывать мой город в общем чате" }),
  ).toHaveAccessibleDescription(/Только название города/);
  await page.getByLabel("Модель", { exact: true }).fill("Тестовая модель");
  await assertAction(page.getByRole("button", { name: "Добавить снасть", exact: true }));
}

async function report(page, width, writes) {
  await page.goto(origin + "/reports/new", { waitUntil: "load" });
  const heading = page.getByRole("heading", { name: "Новый отчёт", exact: true });
  const title = page.getByLabel(/Название отчёта/);
  const next = page.getByRole("button", { name: "Далее", exact: true });
  await next.click();
  await expect(page.getByRole("alert").filter({ hasText: "Укажи название отчёта." })).toBeVisible();
  await title.fill("Мобильный черновик");
  await page.getByLabel(/Вид рыбалки для достижений/).selectOption({ index: 1 });
  await simulateKeyboard(page, title, next);
  await next.click();
  await expect(heading).toBeFocused();
  await resetKeyboard(page);
  const species = page.getByLabel("Вид рыбы", { exact: true });
  const catchCount = await species.count();
  await page.getByRole("button", { name: "+ Рыба" }).click();
  const newCatch = species.nth(catchCount);
  await newCatch.fill("Окунь");
  await page.getByLabel("Вес, кг", { exact: true }).nth(catchCount).fill("0.4");
  const back = page.getByRole("button", { name: "Назад", exact: true });
  await assertAction(back);
  await back.click();
  await expect(title).toHaveValue("Мобильный черновик");
  await next.click();
  await expect(heading).toBeFocused();
  await expect(newCatch).toHaveValue("Окунь");
  await simulateKeyboard(page, newCatch, next);
  if (width === 390) await page.screenshot({ path: evidence + "/" + engine + "-report-catch.png" });
  await next.click();
  await expect(heading).toBeFocused();
  await resetKeyboard(page);
  const publish = page.getByRole("button", { name: "Опубликовать отчёт", exact: true });
  await assertAction(publish);
  await publish.click();
  await expect(page.getByRole("alert").filter({ hasText: /Черновик сохранён/ })).toBeVisible();
  assert.ok(writes.includes("/rest/v1/rpc/publish_report_with_catches"));
  await page.reload();
  await expect(publish).toBeEnabled();
  await back.click();
  await expect(newCatch).toHaveValue("Окунь");
  await back.click();
  await expect(title).toHaveValue("Мобильный черновик");
}

async function communities(page, width) {
  if (![320, 390, 430].includes(width)) return;
  await page.goto(origin + "/communities", { waitUntil: "load" });
  await page.getByLabel("Название клуба", { exact: true }).fill("Мобильный клуб");
  await assertAction(page.getByRole("button", { name: "Оставить заявку на клуб" }));
  await page.getByLabel("Страна (код)", { exact: true }).fill("RU");
  await page.getByLabel("Регион", { exact: true }).fill("Тестовый регион");
  await page.getByLabel("Город", { exact: true }).fill("Тестовый город");
  await page.getByLabel("Заголовок сходки", { exact: true }).fill("Мобильная сходка");
  await assertAction(page.getByRole("button", { name: "Опубликовать", exact: true }));
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
        const writes = await interceptLocalBackend(context);
        for (const scenario of [registration, profile, report, communities]) {
          const page = await context.newPage();
          try {
            await scenario(page, width, writes);
          } catch (error) {
            throw new Error(engine + " " + width + "×" + height + " " + scenario.name, {
              cause: error,
            });
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
    console.log(
      JSON.stringify({
        engine,
        sizes,
        scope: "isolated fixtures and simulated viewport",
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
