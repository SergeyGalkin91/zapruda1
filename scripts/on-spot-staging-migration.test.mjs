import assert from "node:assert/strict";
import test from "node:test";
import { applyOnSpotStagingMigration, stagingReadback } from "./on-spot-staging-migration.mjs";

const env = {
  GITHUB_ACTIONS: "true",
  GITHUB_EVENT_NAME: "push",
  GITHUB_REPOSITORY: "SergeyGalkin91/zapruda1",
  GITHUB_REF: "refs/heads/work/v076-on-spot-plus-stage1-20261105",
  GITHUB_SHA: "a91178b85170cd4371c010dba00c658b6a455dc5",
  ZAPRUDA_STAGING_MIGRATION_TOKEN: "sbp_fc_fixture",
};
const request = "apply 20261105044404 to yudtbifopfnjtjanaqrd 20261106000000";
const pending = {
  staging_fingerprint: true,
  ledger_count: 0,
  exact_ledger: false,
  private_count: 0,
  private_rls_count: 0,
  restrictive_count: 0,
  rpc_present: false,
  rpc_acl_ok: false,
  community_present: false,
};
const installed = {
  ...pending,
  ledger_count: 1,
  exact_ledger: true,
  private_count: 11,
  private_rls_count: 11,
  restrictive_count: 3,
  rpc_present: true,
  rpc_acl_ok: true,
};

function api(...responses) {
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    const reply = responses.shift();
    assert.ok(reply, "unexpected API request");
    return reply;
  };
  return { calls, transport };
}

test("denies the wrong event, branch or request before connecting", async () => {
  const { calls, transport } = api();
  for (const overrides of [
    { GITHUB_EVENT_NAME: "pull_request" },
    { GITHUB_REF: "refs/heads/main" },
  ]) {
    await assert.rejects(
      applyOnSpotStagingMigration({ env: { ...env, ...overrides }, request, transport }),
      /protected STAGING migration workflow/,
    );
  }
  await assert.rejects(
    applyOnSpotStagingMigration({ env, request: "apply another migration", transport }),
    /exact STAGING migration/,
  );
  assert.equal(calls.length, 0);
});

test("requires a scoped token and makes no request with missing or legacy credentials", async () => {
  const { calls, transport } = api();
  for (const credential of ["", "sbp_fixture"]) {
    await assert.rejects(
      applyOnSpotStagingMigration({
        env: { ...env, ZAPRUDA_STAGING_MIGRATION_TOKEN: credential },
        request,
        transport,
      }),
      /scoped Supabase token/,
    );
  }
  assert.equal(calls.length, 0);
});

test("sends the generated guarded SQL once, between independent readbacks of STAGING", async () => {
  const { calls, transport } = api(
    Response.json([pending]),
    new Response(null, { status: 201 }),
    Response.json([installed]),
  );
  const result = await applyOnSpotStagingMigration({ env, request, transport });
  assert.equal(result.status, "STAGING_APPLIED_VERIFIED");
  assert.equal(result.version, "20261105044404");
  assert.equal(result.commit, env.GITHUB_SHA);
  assert.deepEqual(
    calls.map(({ body }) => body.read_only),
    [true, false, true],
  );
  for (const call of calls) {
    assert.equal(
      call.url,
      "https://api.supabase.com/v1/projects/yudtbifopfnjtjanaqrd/database/query",
    );
    assert.equal(call.options.redirect, "error");
    assert.equal(call.options.method, "POST");
    assert.equal(call.options.headers.authorization, "Bearer sbp_fc_fixture");
  }
  assert.equal(calls[0].body.query, stagingReadback);
  assert.equal(calls[2].body.query, stagingReadback);
  assert.match(calls[1].body.query, /SQL Editor bundle v2/);
  assert.match(calls[1].body.query, /sha256\(migration_bytes\)/);
  assert.match(calls[1].body.query, /insert into supabase_migrations\.schema_migrations/);
  assert.match(calls[1].body.query, /\ncommit;\n/);
});

test("never writes on partial installation, a conflicting history or the wrong fingerprint", async () => {
  for (const state of [
    { ...pending, rpc_present: true },
    { ...pending, ledger_count: 1 },
    { ...pending, staging_fingerprint: false },
  ]) {
    const { calls, transport } = api(Response.json([state]));
    await assert.rejects(
      applyOnSpotStagingMigration({ env, request, transport }),
      /preflight detected/,
    );
    assert.deepEqual(
      calls.map(({ body }) => body.read_only),
      [true],
    );
  }
});

test("checks an already applied migration without replaying it", async () => {
  const { calls, transport } = api(Response.json([installed]));
  const result = await applyOnSpotStagingMigration({ env, request, transport });
  assert.equal(result.status, "ALREADY_APPLIED_VERIFIED");
  assert.deepEqual(
    calls.map(({ body }) => body.read_only),
    [true],
  );
});

test("requires exact journal and RLS evidence even after an HTTP success", async () => {
  const { calls, transport } = api(
    Response.json([pending]),
    new Response(null, { status: 201 }),
    Response.json([{ ...installed, private_rls_count: 10 }]),
  );
  await assert.rejects(
    applyOnSpotStagingMigration({ env, request, transport }),
    /without the expected ledger and RLS proof/,
  );
  assert.deepEqual(
    calls.map(({ body }) => body.read_only),
    [true, false, true],
  );
});

test("reports an ambiguous write failure without exposing upstream data or replaying", async () => {
  const { calls, transport } = api(
    Response.json([pending]),
    new Response("private response body", { status: 500 }),
  );
  await assert.rejects(
    applyOnSpotStagingMigration({ env, request, transport }),
    (error) => /HTTP 500/.test(error.message) && !error.message.includes("private response body"),
  );
  assert.deepEqual(
    calls.map(({ body }) => body.read_only),
    [true, false],
  );
});
