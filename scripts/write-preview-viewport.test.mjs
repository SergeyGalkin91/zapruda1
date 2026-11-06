import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { writePreviewViewport } from "./write-preview-viewport.mjs";

const env = {
  CONTEXT: "deploy-preview",
  REVIEW_ID: "93",
  COMMIT_REF: "f3bbe1bc4a731c3ec1c56a5b1d7dce13d8d559ec",
  VITE_SUPABASE_URL: "https://yudtbifopfnjtjanaqrd.supabase.co",
};

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "zapruda-hosted-qa-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "qa"));
  await writeFile(join(root, "qa/hosted-viewport.html"), await readFile("qa/hosted-viewport.html"));
  await writeFile(join(root, "qa/premium-gallery.html"), await readFile("qa/premium-gallery.html"));
  return root;
}

test("PR93 STAGING gets the hosted page and exact build SHA", async (t) => {
  const root = await fixture(t);
  assert.deepEqual(await writePreviewViewport(root, env), { enabled: true, sha: env.COMMIT_REF });
  const html = await readFile(join(root, "dist/__qa/viewport.html"), "utf8");
  assert.ok(html.includes(env.COMMIT_REF));
  assert.ok(!html.includes("__DEPLOYED_SHA__"));
  assert.ok(!html.includes("__REVIEW_ID__"));
  assert.ok(html.includes("deploy-preview-93--zapruda1.netlify.app"));
  assert.ok(!html.includes("sonvniuwtvzzyuglscah"));
  assert.ok(!/localStorage|sessionStorage|document\.cookie|access_token|Authorization/.test(html));
  const gallery = await readFile(join(root, "dist/__qa/premium.html"), "utf8");
  assert.ok(gallery.includes(env.COMMIT_REF));
  assert.ok(gallery.includes("390 × 844"));
  assert.ok(!gallery.includes("__DEPLOYED_SHA__"));
  assert.ok(
    !/localStorage|sessionStorage|document\.cookie|access_token|Authorization/.test(gallery),
  );
});

test("mobile-first STAGING preview uses only its own review host", async (t) => {
  const root = await fixture(t);
  const mobile = { ...env, HEAD: "work/mobile-first-premium-20261106", REVIEW_ID: "201" };
  assert.deepEqual(await writePreviewViewport(root, mobile), {
    enabled: true,
    sha: env.COMMIT_REF,
  });
  for (const page of ["viewport.html", "premium.html"]) {
    const html = await readFile(join(root, "dist/__qa", page), "utf8");
    assert.ok(html.includes("deploy-preview-201--zapruda1.netlify.app"));
    assert.ok(!html.includes("deploy-preview-93--zapruda1.netlify.app"));
  }
  assert.deepEqual(await writePreviewViewport(root, { ...mobile, REVIEW_ID: "201<script>" }), {
    enabled: false,
  });
});

test("production, branch deploys and other PRs remove stale QA output", async (t) => {
  const root = await fixture(t);
  for (const overrides of [
    { CONTEXT: "production" },
    { CONTEXT: "branch-deploy" },
    { REVIEW_ID: "111" },
    { CONTEXT: undefined },
  ]) {
    await writePreviewViewport(root, env);
    assert.deepEqual(await writePreviewViewport(root, { ...env, ...overrides }), {
      enabled: false,
    });
    await assert.rejects(readFile(join(root, "dist/__qa/viewport.html")), { code: "ENOENT" });
    await assert.rejects(readFile(join(root, "dist/__qa/premium.html")), { code: "ENOENT" });
  }
});

test("wrong backend and unverified or injected SHA fail before publication", async (t) => {
  const root = await fixture(t);
  for (const overrides of [
    { VITE_SUPABASE_URL: "https://other.supabase.co" },
    { COMMIT_REF: "<script>bad</script>" },
    { COMMIT_REF: "" },
  ]) {
    await assert.rejects(writePreviewViewport(root, { ...env, ...overrides }), /QA_VIEWPORT_/);
    await assert.rejects(readFile(join(root, "dist/__qa/viewport.html")), { code: "ENOENT" });
  }
});

test("hosted QA permits the isolated immutable preview and rejects unrelated hosts", async (t) => {
  const root = await fixture(t);
  await writePreviewViewport(root, env);
  for (const page of ["viewport.html", "premium.html"]) {
    const html = await readFile(join(root, "dist/__qa", page), "utf8");
    const declaration = html.match(/const allowed =[^;]+;/)?.[0];
    assert.ok(declaration, "Missing host boundary");
    for (const [hostname, expected] of [
      ["deploy-preview-93--zapruda1.netlify.app", true],
      ["6aeba60ab32502a76dd53e60--zapruda1.netlify.app", true],
      ["deploy-preview-111--zapruda1.netlify.app", false],
      ["premium--zapruda1.netlify.app", false],
      ["zapruda1.netlify.app", false],
      ["6aeba60ab32502a76dd53e60--other.netlify.app", false],
      ["6aeba60ab32502a76dd53e60--zapruda1.netlify.app.evil.test", false],
    ]) {
      assert.equal(
        runInNewContext(declaration + " allowed;", { location: { hostname } }),
        expected,
        hostname,
      );
    }
  }
});
