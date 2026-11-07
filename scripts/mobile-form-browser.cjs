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
  const clearOfActions = await field.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const actions = element.closest("form").querySelector(".z-sticky-form-actions");
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.top >= 0 && box.bottom <= actions.getBoundingClientRect().top + 1 && hit === element;
  });
  assert.ok(clearOfActions, `${engine}: focused field must stay clear of the sticky actions`);
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
  const question = page.locator(".z-single-field-content");
  const place = question.getByLabel("Водоём или место", { exact: true });
  const title = question.getByLabel(/Название отчёта/);
  const next = page.getByRole("button", { name: "Далее", exact: true });
  const skip = page.getByRole("button", { name: "Пропустить", exact: true });
  const back = page.getByRole("button", { name: "Назад", exact: true });
  const frame = () =>
    page.locator(".z-single-field-flow").evaluate((element) => {
      const top = element.getBoundingClientRect().top;
      return [
        element.querySelector(".z-single-field-content .field").getBoundingClientRect().top - top,
        element.querySelector(".z-single-field-actions").offsetTop,
      ];
    });
  const labelTop = () =>
    place.evaluate((element) => parseFloat(getComputedStyle(element.labels[0]).top));
  const shot = async (name) => {
    if (width === 390) {
      await page.waitForTimeout(350);
      await page.screenshot({ path: evidence + "/" + engine + "-glass-" + name + ".png" });
    }
  };
  await expect(next).toBeEnabled();
  await expect.poll(labelTop).toBe(16);
  const style = await place.evaluate((element) => ({
    radius: getComputedStyle(element).borderRadius,
    height: element.getBoundingClientRect().height,
  }));
  assert.equal(style.radius, "999px");
  assert.ok(style.height >= 44);
  const buttonStyle = await next.evaluate((element) => ({
    radius: getComputedStyle(element).borderRadius,
    background: getComputedStyle(element).backgroundImage,
  }));
  assert.equal(buttonStyle.radius, "999px");
  assert.match(buttonStyle.background, /gradient/);
  const initialFrame = await frame();
  await shot("empty");
  await place.focus();
  await expect.poll(labelTop).toBeLessThan(12);
  await shot("focused");
  await place.fill("Волга");
  await shot("filled");
  await page.evaluate(() => {
    const stage = document.querySelector(".z-single-field-stage");
    stage.addEventListener("animationstart", (event) => {
      if (event.animationName === "z-single-field-exit") stage.dataset.sawExit = "true";
    });
  });
  await next.click();
  const date = question.getByLabel("Дата рыбалки", { exact: true });
  await expect(date).toBeVisible();
  await expect(question.getByRole("heading")).toBeFocused();
  const dateFrame = await frame();
  assert.ok(
    dateFrame.every((value, i) => Math.abs(value - initialFrame[i]) <= 1),
    `Field and action bar must keep their position: ${initialFrame} → ${dateFrame}`,
  );
  if (width === 390) {
    await expect(page.locator(".z-single-field-stage")).toHaveAttribute("data-saw-exit", "true");
  } else {
    await expect(page.locator(".z-single-field-outgoing")).toHaveCount(0);
  }
  await shot("date");
  await skip.click();
  await expect(title).toBeVisible();
  await expect(skip).toHaveCount(0);
  await next.click();
  await expect(page.getByRole("alert").filter({ hasText: "Укажи название отчёта." })).toBeVisible();
  await back.click();
  await expect(date).toHaveValue("");
  await back.click();
  await expect(place).toHaveValue("Волга");
  await next.click();
  await skip.click();
  await title.fill("Мобильный черновик");
  await simulateKeyboard(page, title, next);
  await next.click();
  await expect(question.getByRole("heading")).toBeFocused();
  await resetKeyboard(page);
  await question.getByLabel(/Вид рыбалки для достижений/).selectOption({ index: 1 });
  await next.click();
  const species = question.getByRole("textbox", { name: "Вид рыбы", exact: true });
  await species.fill("Окунь");
  await next.click();
  await question.getByLabel("Вес, кг", { exact: true }).fill("0.4");
  await back.click();
  await expect(species).toHaveValue("Окунь");
  await next.click();
  await expect(question.getByLabel("Вес, кг", { exact: true })).toHaveValue("0.4");
  await next.click();
  await skip.click();
  await skip.click();
  await skip.click();
  const review = question.getByRole("heading", { name: "Проверь отчёт" });
  const edit = question.getByRole("button", { name: "Изменить: Место", exact: true });
  await expect(review).toBeVisible();
  await shot("review");
  await edit.click();
  await expect(place).toHaveValue("Волга");
  await place.fill("Волга у города");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(edit).toContainText("Волга у города");
  await page.getByRole("button", { name: "Сохранить черновик", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Черновик сохранён/ })).toBeVisible();
  const publish = page.getByRole("button", { name: "Опубликовать отчёт", exact: true });
  await assertAction(publish);
  await publish.click();
  await expect(page.getByRole("alert").filter({ hasText: /Черновик сохранён/ })).toBeVisible();
  assert.ok(writes.includes("/rest/v1/rpc/publish_report_with_catches"));
  await page.reload();
  await expect(publish).toBeEnabled();
  await expect(edit).toContainText("Волга у города");
  await expect(
    question.getByRole("button", { name: "Изменить: Рыба №1", exact: true }),
  ).toContainText("Окунь");
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
        reducedMotion: width === 390 ? "no-preference" : "reduce",
        ...(width === 390 && engine === "chromium"
          ? {
              recordVideo: {
                dir: "appearance-evidence/mobile-form-recording",
                size: { width, height },
              },
            }
          : {}),
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
            const video = page.video();
            if (video) {
              if (scenario === report) await video.saveAs(evidence + "/premium-glass-390.webm");
              await video.delete();
            }
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
