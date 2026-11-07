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
  let pendingReportId;
  let publishedReport;
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
    if (method === "POST" && url.pathname === "/rest/v1/rpc/publish_report_with_catches") {
      const payload = request.postDataJSON();
      if (!pendingReportId) {
        pendingReportId = payload.p_report_id;
        failedWrites.push(url.pathname);
        return route.abort("failed");
      }
      assert.equal(
        payload.p_report_id,
        pendingReportId,
        "Retry must reuse the draft publication ID",
      );
      assert.equal(
        payload.p_report.is_public,
        true,
        "Only a deliberately public fixture goes to the feed",
      );
      publishedReport = {
        ...payload.p_report,
        id: pendingReportId,
        user_id: user.id,
        created_at: new Date().toISOString(),
        profiles: { username: "mobile_qa" },
      };
      return route.fulfill({ json: pendingReportId, headers });
    }
    if (method === "GET" && url.pathname === "/rest/v1/fishing_reports")
      return route.fulfill({ json: publishedReport ? [publishedReport] : [], headers });
    if (
      (method === "POST" && url.pathname === "/auth/v1/signup") ||
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
  const stage = page.locator(".z-single-field-content");
  const username = stage.getByRole("textbox", { name: "Никнейм" });
  const email = stage.getByRole("textbox", { name: "Email" });
  const password = stage.locator("input[name=password]");
  const next = page.getByRole("button", { name: "Далее", exact: true });
  const submit = page.getByRole("button", { name: "Зарегистрироваться", exact: true });
  await expect(next).toBeEnabled();
  await assertAction(next);
  await username.fill("!!!!");
  await next.click();
  await expect(page.getByRole("alert").filter({ hasText: "3–24 символа" })).toBeVisible();
  await expect(username).toHaveAttribute("aria-invalid", "true");
  if (width === 390)
    await page.screenshot({ path: evidence + "/" + engine + "-registration-validation.png" });
  await username.fill("mobile_qa");
  await next.click();
  await checkLabel(page, false);
  await email.focus();
  await checkLabel(page, true);
  await email.fill(user.email);
  await checkLabel(page, true);
  await simulateKeyboard(page, email, next);
  await next.click();
  await expect(stage.getByRole("heading")).toBeFocused();
  await resetKeyboard(page);
  await password.fill("isolated-qa-value");
  await next.click();
  const reviewEmail = stage.getByRole("button", { name: "Изменить: Email", exact: true });
  await expect(reviewEmail).toContainText(user.email);
  await expect(stage).not.toContainText("isolated-qa-value");
  assert.ok(!writes.includes("/auth/v1/signup"), "The review must not trigger registration");
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: /Проверь подключение/ })).toBeVisible();
  assert.ok(writes.includes("/auth/v1/signup"));
  await reviewEmail.click();
  await expect(email).toHaveValue(user.email);
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await stage.getByRole("button", { name: "Изменить: Пароль", exact: true }).click();
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
  if (width === 390) await page.emulateMedia({ reducedMotion: "no-preference" });
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
  const disciplines = question.getByRole("group", { name: "Вид рыбалки для достижений *" });
  const questionScroll = () => question.evaluate((node) => node.scrollTop);
  await disciplines.getByText("Фидер", { exact: true }).click();
  await disciplines.getByText("Спиннинг", { exact: true }).click();
  await expect(disciplines.getByRole("radio", { name: "Спиннинг" })).toBeChecked();
  assert.equal(await questionScroll(), 0, "Selecting a discipline must leave its question in view");
  await expect
    .poll(() =>
      disciplines
        .locator("label")
        .first()
        .evaluate((tile) => {
          const list = tile.closest(".z-liquid-category-scroll").getBoundingClientRect();
          const box = tile.getBoundingClientRect();
          return box.top >= list.top - 1 && box.bottom <= list.bottom + 1;
        }),
    )
    .toBe(true);
  if (width === 390) {
    await page.screenshot({
      path: evidence + "/" + engine + "-liquid-category.png",
      animations: "disabled",
    });
  }
  await next.click();
  const species = question.getByLabel("Вид рыбы", { exact: true });
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
  await question.getByRole("checkbox", { name: "Опубликовать в общей ленте" }).check();
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
  await publish.click();
  await expect(page).toHaveURL(origin + "/");
  const article = page.getByRole("article").filter({ hasText: "Мобильный черновик" });
  await expect(article).toBeVisible();
  await expect(article).toContainText("Волга у города");
  await page.reload();
  await expect(article).toBeVisible();
}

async function liquidDrop(page, width) {
  if (width !== 390) return;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(origin + "/settings#liquid-drop", { waitUntil: "load" });
  await page.locator('[data-appearance-ready="true"]').waitFor();
  const settings = page.locator("#liquid-drop");
  await settings.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const preview = settings.getByRole("group", { name: "Предпросмотр выделения" });
  const indicator = preview.locator(".z-liquid-indicator");
  const strength = settings.getByRole("slider", { name: "Интенсивность" });
  const geometry = () =>
    preview.evaluate((element) =>
      [element, ...element.querySelectorAll("button")].map((node) => {
        const box = node.getBoundingClientRect();
        return [box.x, box.y - element.getBoundingClientRect().y, box.width, box.height];
      }),
    );
  const initialGeometry = await geometry();
  const firstCell = initialGeometry[1];
  const layer = await indicator.boundingBox();
  assert.ok(
    layer &&
      Math.abs(layer.width - firstCell[2]) <= 1 &&
      Math.abs(layer.height - firstCell[3]) <= 1,
    "Liquid indicator must occupy exactly one cell",
  );
  assert.equal(await indicator.evaluate((node) => getComputedStyle(node).pointerEvents), "none");
  await expect(strength).toHaveValue("40");
  const variants = [
    ["Classic Glass", "classic-glass", ".z-liquid-classic"],
    ["Soft Liquid", "soft-liquid", '[data-liquid-art="soft-liquid"]'],
    ["Organic Drop", "organic-drop", '[data-liquid-art="organic-drop"]'],
  ];
  const silhouettes = [];
  for (const [title, style, selector] of variants) {
    await settings.getByText(title, { exact: true }).click();
    await expect(indicator.locator(selector)).toBeVisible();
    const path = indicator.locator(selector + " > path").first();
    let original;
    for (const level of [20, 40, 70, 100]) {
      await settings.getByRole("button", { name: level + "%", exact: true }).click();
      await expect(strength).toHaveValue(String(level));
      assert.equal(
        await indicator.evaluate((element) =>
          getComputedStyle(element).getPropertyValue("--z-liquid-strength").trim(),
        ),
        String(level / 100),
      );
      if (style !== "classic-glass") {
        const current = await path.getAttribute("d");
        original ??= current;
        assert.equal(current, original, "Changing intensity must preserve the silhouette");
      }
      assert.deepEqual(await geometry(), initialGeometry);
      if (engine === "chromium")
        await page.screenshot({
          path: evidence + "/liquid-390-" + style + "-" + level + ".png",
          animations: "disabled",
        });
    }
    if (original) silhouettes.push(original);
  }
  assert.equal(new Set(silhouettes).size, 2, "Soft and Organic need separate contours");
  await page.addInitScript(() => {
    window.liquidMovements = 0;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.matches(".z-liquid-indicator") && this.closest(".z-liquid-track"))
        window.liquidMovements++;
      return animate.apply(this, args);
    };
  });
  await page.reload();
  await page.locator('[data-appearance-ready="true"]').waitFor();
  const moves = () => page.evaluate(() => window.liquidMovements);
  await preview.getByRole("button", { name: "Вокруг" }).click();
  await expect.poll(moves).toBe(1);
  await expect(preview.getByRole("button", { name: "Вокруг" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await settings.getByRole("checkbox", { name: "Анимация" }).uncheck();
  await preview.getByRole("button", { name: "SPOT" }).click();
  assert.equal(await moves(), 1);
  await settings.getByRole("checkbox", { name: "Анимация" }).check();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await preview.getByRole("button", { name: "Лента" }).click();
  assert.equal(await moves(), 1);
  await strength.press("Home");
  await expect(strength).toHaveValue("0");
  await settings.getByRole("button", { name: "70%", exact: true }).click();
  await page.reload();
  await page.locator('[data-appearance-ready="true"]').waitFor();
  await expect(strength).toHaveValue("70");
  await expect(settings.getByRole("radio", { name: "Organic Drop" })).toBeChecked();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("link", { name: "Вернуться к ленте" }).click();
  const nav = page.getByRole("navigation", { name: "Разделы сообщества" });
  const navGeometry = () =>
    nav.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return [box.x + window.scrollX, box.y + window.scrollY, box.width, box.height];
    });
  await expect(nav.getByRole("link", { name: "Лента", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const feedGeometry = await navGeometry();
  await nav.getByRole("link", { name: "Вокруг", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Вокруг", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: "Сообщества", exact: true })).toBeVisible();
  await expect.poll(navGeometry).toEqual(feedGeometry);
  await nav.getByRole("link", { name: "SPOT", exact: true }).click();
  await expect(nav.getByRole("link", { name: "SPOT", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("heading", { name: "Места, которые объединяют.", exact: true }),
  ).toBeVisible();
  await expect.poll(navGeometry).toEqual(feedGeometry);
  await expect.poll(moves).toBe(2);
}

async function globalNavigation(page, width) {
  if (![320, 375, 390, 430].includes(width)) return;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(origin + "/", { waitUntil: "load" });
  const bottom = page.getByRole("navigation", { name: "Мобильная навигация" });
  const top = page.getByRole("navigation", { name: "Основная навигация" });
  const state = async (nav, label) => {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(nav).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(nav.locator(".z-liquid-indicator")).toBeVisible();
    await expect
      .poll(async () => {
        const [tile, drop] = await Promise.all([
          link.boundingBox(),
          nav.locator(".z-liquid-indicator").boundingBox(),
        ]);
        return !!(
          tile &&
          drop &&
          ["x", "y", "width", "height"].every((k) => Math.abs(tile[k] - drop[k]) < 1)
        );
      })
      .toBe(true);
    assert.equal(await link.evaluate((node) => getComputedStyle(node).color), "rgb(242, 242, 242)");
    await link.click({ trial: true });
  };
  const screenshot = async (name) => {
    if (width === 390)
      await page.screenshot({
        path: evidence + "/" + engine + "-global-" + name + ".png",
        animations: "disabled",
      });
  };
  await state(bottom, "Лента");
  assert.equal(await top.isVisible(), false);
  await screenshot("feed-390");
  const fixed = await bottom.boundingBox();
  await bottom.getByRole("link", { name: "Комьюнити", exact: true }).click();
  await page.getByRole("heading", { name: "Сообщества", exact: true }).waitFor();
  await state(bottom, "Комьюнити");
  assert.deepEqual(await bottom.boundingBox(), fixed);
  const community = page.getByRole("navigation", { name: "Каталог сообществ" });
  await expect(community.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(community.locator(".z-liquid-indicator")).toBeVisible();
  await screenshot("communities-390");
  await community.getByRole("link", { name: "Клубы", exact: true }).click();
  await expect(community.getByRole("link", { name: "Клубы", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(community.locator('[aria-current="page"]')).toHaveCount(1);
  await page.reload();
  await expect(community.getByRole("link", { name: "Клубы", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page
    .getByRole("navigation", { name: "Разделы сообщества" })
    .getByRole("link", { name: "SPOT" })
    .click();
  await page.getByRole("heading", { name: "Места, которые объединяют.", exact: true }).waitFor();
  await state(bottom, "Комьюнити");
  await screenshot("spot-390");
  await page.goBack();
  await state(bottom, "Комьюнити");
  await bottom.getByRole("link", { name: "Выезды", exact: true }).click();
  await state(bottom, "Выезды");
  await screenshot("bottom-390");
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    true,
  );
  if (width !== 390) return;
  await page.setViewportSize({ width: 1440, height: 900 });
  await state(top, "Выезды");
  assert.equal(await bottom.isVisible(), false);
  await top.getByRole("link", { name: "SPOT", exact: true }).click();
  await state(top, "SPOT");
  await screenshot("top-1440");
  await page.goto(origin + "/settings#liquid-drop");
  await page.locator('[data-appearance-ready="true"]').waitFor();
  await page.locator("#liquid-drop").evaluate((node) => node.scrollIntoView({ block: "center" }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#liquid-drop").evaluate((node) => node.scrollIntoView({ block: "center" }));
  await screenshot("settings-390");
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
        for (const scenario of [
          registration,
          profile,
          report,
          communities,
          liquidDrop,
          globalNavigation,
        ]) {
          const page = await context.newPage();
          try {
            await scenario(page, width, writes);
          } catch (error) {
            await page
              .screenshot({
                path: evidence + "/" + engine + "-" + width + "-" + scenario.name + "-failure.png",
              })
              .catch(() => {});
            throw new Error(engine + " " + width + "×" + height + " " + scenario.name, {
              cause: error,
            });
          } finally {
            await page.close();
            const video = page.video();
            if (video) {
              if (scenario === report) await video.saveAs(evidence + "/premium-glass-390.webm");
              if (scenario === liquidDrop) await video.saveAs(evidence + "/liquid-drop-390.webm");
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
