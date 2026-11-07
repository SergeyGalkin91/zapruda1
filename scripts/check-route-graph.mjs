/** Checks actual registered routes and literal product links, not backend acceptance. */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
const read = (p) => readFileSync(p, "utf8");
const graph = JSON.parse(read("docs/ZAPRUDA_ROUTE_GRAPH.json"));
const normalize = (url) => url.split(/[?#]/)[0].replace(/\/$/, "") || "/";
const actual = readdirSync("src/routes")
  .filter((p) => p.endsWith(".tsx"))
  .flatMap((p) => {
    const m = read("src/routes/" + p).match(/createFileRoute\("([^"\n]+)"\)/);
    return m ? [{ path: m[1], source: "src/routes/" + p }] : [];
  });
assert.deepEqual(
  graph.routes.map(({ path, source }) => ({ path, source })),
  actual,
  "Screen registry drift: update the map and review transitions",
);
const registered = new Set(actual.map((r) => normalize(r.path)));
const errors = [];
const previewViewport = "/__qa/viewport.html";
const hasPreviewViewport =
  read("scripts/write-preview-viewport.mjs").includes('"dist' + previewViewport + '"') &&
  read("qa/hosted-viewport.html").includes("__DEPLOYED_SHA__");
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".tsx") && !file.includes(".test.")) {
      for (const m of read(file).matchAll(/(?:href|to)=["'](\/[^"']*)["']/g)) {
        const target = normalize(m[1]);
        // Only the STAGING shell links to the build-generated viewport document.
        const generatedPreview =
          file === "src/components/Shell.tsx" && target === previewViewport && hasPreviewViewport;
        if (!registered.has(target) && !generatedPreview) errors.push(file + " → " + m[1]);
      }
    }
  }
}
walk("src");
for (const edge of graph.journey)
  for (const side of ["from", "to"])
    if (!registered.has(normalize(edge[side]))) errors.push("Journey → " + edge[side]);
assert.deepEqual(errors, [], "Dangling internal product routes");
console.log(
  JSON.stringify({
    registeredScreens: actual.length,
    journeyTransitions: graph.journey.length,
    literalLinks: "PASS",
    scope: "route contract, not E2E",
  }),
);
