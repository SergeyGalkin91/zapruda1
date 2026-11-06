/* eslint-disable prettier/prettier -- Executable browser QA. */
/** Real rendered application, isolated guest data. NOT JWT/hosted acceptance. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engines = require("playwright");
const { assertShellBounds, assertMobileNav, waitForMobileRoute, mobileRoutes } = require("./browser-shell-bounds.cjs");
const { appThemeButton } = require("./browser-appearance-controls.cjs");
const engine = process.env.VISUAL_BROWSER || "chromium";
const base = process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000";
const out = path.resolve(process.env.VISUAL_OUTPUT_DIR || "appearance-evidence", "premium");
const shots = [], checks = [];
fs.mkdirSync(out, { recursive: true });

(async () => {
  assert(["chromium", "firefox", "webkit"].includes(engine));
  const browser = await engines[engine].launch({ headless: true });
  try {
    for (const width of [320,390,430,768,1440]) {
      const context = await browser.newContext({ viewport:{width,height:844}, locale:"ru-RU", reducedMotion:"reduce" });
      const badRequests = [], errors = [];
      context.on("request", (request) => { if (request.url().includes("sonvniuwtvzzyuglscah.supabase.co")) badRequests.push("production request"); });
      await context.route("https://ci-placeholder.supabase.co/**", route => route.fulfill({status:route.request().url().includes("/auth/")?401:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:route.request().url().includes("/auth/")?'{"message":"No test session"}':"[]"}));
      const page = await context.newPage();
      page.on("pageerror", e => errors.push(e.message));
      for (const theme of ["classic","electric-blue"]) {
        await page.goto(base+"/settings", {waitUntil:"domcontentloaded"});
        await page.locator('[data-appearance-ready="true"]').waitFor({state:"visible"});
        assert.equal(await page.getByRole("button",{name:/^Matte Black/}).count(),2,"Theme/wallpaper name collision fixture missing");
        const paperBefore=await page.locator("html").getAttribute("data-zapruda-wallpaper");
        const themeControl=appThemeButton(page,theme);
        assert.equal(await themeControl.count(),1,"App theme must be unambiguous within its region");
        await themeControl.click();
        await page.waitForFunction(t => document.documentElement.dataset.zaprudaBackground===t, theme);
        assert.equal(await page.locator("html").getAttribute("data-zapruda-wallpaper"),paperBefore,"Theme changed independent wallpaper");
        for (const route of ["/welcome","/","/reports/new","/communities","/competitions","/partners","/chat","/messages","/big-fish","/on-spot","/profile"]) {
          await page.goto(base+route, {waitUntil:"domcontentloaded"});
          await page.locator("main h1").first().waitFor();
          await page.waitForFunction(t => document.documentElement.dataset.zaprudaBackground===t,theme);
          await assertShellBounds(page);
          if (width <= 430) await assertMobileNav(page);
          const metrics = await page.evaluate(() => ({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,theme:document.documentElement.dataset.zaprudaBackground,heading:document.querySelector("main h1")?.textContent,brand:!!document.querySelector('.z-brand-word path'),nav:[...document.querySelectorAll('nav[aria-label="Мобильная навигация"] a')].map(a=>a.getAttribute("href"))}));
          assert(metrics.scrollWidth<=metrics.width+1, route+" overflow");
          assert(metrics.brand, route+" outlined approved brand missing");
          assert.deepEqual(metrics.nav,mobileRoutes);
          assert(!await page.getByText("This page didn't load",{exact:false}).count(),route+" runtime error");
          const filename=engine+"-"+width+"-"+theme+"-"+(route==="/"?"feed":route.slice(1))+".png";
          await page.screenshot({path:path.join(out,filename),fullPage:false});
          shots.push(filename);checks.push({route,theme,width,overflow:false});
        }
        if (width === 320 || width === 390) {
          for (const [index, route] of mobileRoutes.entries()) {
            const links = await assertMobileNav(page);
            await links.nth(index).click();
            await page.waitForURL(url => url.pathname === route);
            await waitForMobileRoute(page, index);
          }
          const menu = page.getByLabel("Открыть список разделов");
          await menu.click();
          await page.getByRole("navigation", { name: "Остальные разделы" }).waitFor();
          await menu.press("Escape");
          await page.getByRole("navigation", { name: "Остальные разделы" }).waitFor({state:"hidden"});
          assert(await menu.evaluate(el => document.activeElement === el));
          checks.push({mobileNav:true,width,theme});
        }
        await page.goto(base+"/settings",{waitUntil:"domcontentloaded"});
        await page.locator('[data-appearance-ready="true"]').waitFor({state:"visible"});
        for (const wallpaper of ["Matte Black","Carbon","Neon Threads","Topographic"]) {
          const value={"Matte Black":"matte-black",Carbon:"carbon","Neon Threads":"neon-threads",Topographic:"topographic"}[wallpaper];
          const option=page.locator('section[aria-labelledby="wallpaper-title"]').getByRole("button",{name:new RegExp("^"+wallpaper)});
          await option.click();
          await page.waitForFunction(v=>document.documentElement.dataset.zaprudaWallpaper===v,value);
          await page.reload({waitUntil:"domcontentloaded"});
          await page.waitForFunction(v=>document.documentElement.dataset.zaprudaWallpaper===v,value);
          await page.locator('section[aria-labelledby="wallpaper-title"] button[aria-pressed="true"]')
            .filter({hasText:wallpaper}).waitFor({state:"visible"});
          assert.equal(await option.getAttribute("aria-pressed"),"true");
          assert.equal(await page.evaluate(()=>document.documentElement.dataset.zaprudaBackground),theme);
          const frame = await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,animation:[...document.querySelectorAll('.z-wallpaper *')].some(e=>getComputedStyle(e).animationName!=="none")}));
          assert(!frame.overflow&&!frame.animation,"Wallpaper overflow or animation");
          checks.push({wallpaper:value,theme,width,persisted:true,reducedMotion:true});
        }
        // Exercise real geography filtering and menu targets; never create fixture data.
        await page.goto(base+"/communities",{waitUntil:"domcontentloaded"});
        const sectionNav = page.getByRole("navigation", {name:"Каталог сообществ"});
        const clubs = sectionNav.getByRole("link", {name:"Клубы",exact:true});
        await clubs.click();
        await page.waitForURL(url => url.hash === "#community-clubs");
        await clubs.and(sectionNav.locator('[aria-current="page"]')).waitFor();
        assert.equal(await sectionNav.locator('[aria-current="page"]').count(),1);
        await page.goto(base+"/communities",{waitUntil:"domcontentloaded"});
        await page.getByRole("searchbox",{name:"Поиск страны"}).fill("Россия");
        await page.getByRole("button",{name:/Россия/}).click();
        assert(await page.getByRole("link",{name:/Открыть чаты страны/}).count());
      }
      assert.deepEqual(badRequests,[]);assert.deepEqual(errors,[]);
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(out,engine+"-summary.json"),JSON.stringify({engine,scope:"isolated guest browser / actual application UI; no JWT claim",checks,screenshots:shots},null,2));
  console.log(JSON.stringify({engine,passed:true,checks:checks.length,screenshots:shots.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
