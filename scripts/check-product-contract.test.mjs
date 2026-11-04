import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, symlinkSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { check } from "./check-product-contract.mjs";
function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), "zc-contract-"));
  try {
    for (const p of ["docs", "AGENTS.md"]) cpSync(p, join(root, p), { recursive: true });
    for (const p of [".git", ".github", "src", "supabase", "scripts"])
      symlinkSync(resolve(p), join(root, p));
    const path = join(root, "docs/ZAPRUDA_FEATURES.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    fn({ root, data, save: () => writeFileSync(path, JSON.stringify(data)) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("accepts full original contract", () => assert.deepEqual(check(), []));
test("rejects deleted original ID even with a decision entry", () =>
  fixture(({ root, data, save }) => {
    data.features.pop();
    save();
    assert.ok(check(root).some((e) => e.includes("56 original")));
  }));
test("rejects duplicate ID", () =>
  fixture(({ root, data, save }) => {
    data.features[1].id = data.features[0].id;
    save();
    assert.ok(check(root).some((e) => e.includes("Duplicate")));
  }));
test("rejects unsupported status", () =>
  fixture(({ root, data, save }) => {
    data.features[0].status = "DONE";
    save();
    assert.ok(check(root).some((e) => e.includes("invalid status")));
  }));
test("rejects missing required document", () =>
  fixture(({ root }) => {
    rmSync(join(root, "docs/ZAPRUDA_UI_ACCEPTANCE.md"));
    assert.ok(check(root).some((e) => e.includes("Missing required")));
  }));
test("rejects missing source and local link", () =>
  fixture(({ root, data, save }) => {
    data.features[0].source = "src/missing-feature.tsx";
    save();
    writeFileSync(join(root, "docs/ZAPRUDA_UI_ACCEPTANCE.md"), "[broken](missing-contract.md)");
    assert.ok(check(root).some((e) => e.includes("missing source")));
    assert.ok(check(root).some((e) => e.includes("broken local link")));
  }));

test("rejects missing theme CSS and workflow paths", () =>
  fixture(({ root, data, save }) => {
    for (const path of [
      "src/missing-theme.css",
      ".github/workflows/missing-contract.yml",
      "docs/missing-source.md",
    ]) {
      data.features[0].source = path;
      save();
      assert.ok(check(root).some((e) => e.includes("missing source " + path)));
    }
  }));
