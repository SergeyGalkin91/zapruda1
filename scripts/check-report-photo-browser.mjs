import { createRequire } from "node:module";
const { chromium, firefox } = createRequire(import.meta.url)("playwright");
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:4189";
const source = [...readFileSync("src/test/fixtures/report-photo-with-exif.jpg")];
const engine = process.env["PHOTO_BROWSER"] ?? "chromium";
assert.ok(["chromium", "firefox"].includes(engine));
const browser = await (engine === "firefox" ? firefox : chromium).launch();
try {
  const page = await browser.newPage();
  const productionRequests = [];
  await page.route("https://**.supabase.co/**", (route) => {
    if (new URL(route.request().url()).hostname === "sonvniuwtvzzyuglscah.supabase.co")
      productionRequests.push(route.request().method());
    return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async (sourceBytes) => {
    const { prepareReportPhoto } = await import("/src/lib/report-photo.ts");
    const file = new File([Uint8Array.from(sourceBytes)], "PRIVATE_GPS_FILENAME.jpg", {
      type: "image/jpeg",
    });
    const prepared = await prepareReportPhoto(file);
    const decoded = await createImageBitmap(prepared);
    const dimensions = { width: decoded.width, height: decoded.height };
    decoded.close();
    return {
      ...dimensions,
      type: prepared.type,
      size: prepared.size,
      bytes: Array.from(new Uint8Array(await prepared.arrayBuffer())),
    };
  }, source);
  assert.equal(result.type, "image/jpeg");
  // Source pixels are 12x8 with EXIF orientation=6; the derivative is upright.
  assert.deepEqual([result.width, result.height], [8, 12]);
  assert.ok(result.size > 0 && result.size <= 5 * 1024 * 1024);
  assert.equal(Buffer.from(result.bytes).includes(Buffer.from("Exif\0\0")), false);
  assert.equal(Buffer.from(result.bytes).includes(Buffer.from("ZAPRUDA_QA_SYNTHETIC_GPS")), false);
  assert.deepEqual(productionRequests, []);
  mkdirSync("qa/report-privacy", { recursive: true });
  const evidence = {
    browser: engine,
    width: result.width,
    height: result.height,
    type: result.type,
    bytes: result.size,
    exifRemoved: true,
    orientedPixels: true,
    source: "synthetic test fixture",
    productionRequests: 0,
  };
  writeFileSync(`qa/report-privacy/${engine}.json`, JSON.stringify(evidence, null, 2));
  console.log("PASS browser photo conversion", JSON.stringify(evidence));
} finally {
  await browser.close();
}
