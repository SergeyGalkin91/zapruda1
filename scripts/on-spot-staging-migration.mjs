import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const project = "yudtbifopfnjtjanaqrd";
const repository = "SergeyGalkin91/zapruda1";
const branch = "refs/heads/work/v076-on-spot-plus-stage1-20261105";
const version = "20261105044404";
const name = "v076_on_spot_social_privacy";
const sourceSha256 = "194e9b0606071a674cd15b44631c062d21aab657af0cb639e1f3459b2c57e16e";
const endpoint = `https://api.supabase.com/v1/projects/${project}/database/query`;

export const stagingReadback = `
with ledger as (
  select version, name, statements
  from supabase_migrations.schema_migrations
  where version = '${version}' or name = '${name}'
), private_objects as (
  select c.oid, c.relkind, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'zc_osp_internal' and c.relname in (
    'preferences', 'presences', 'closed_presence_sessions', 'blocks', 'invitations',
    'announcements', 'deliveries', 'photo_shares', 'photo_consents', 'abuse_reports', 'events'
  )
), rpc as (
  select to_regprocedure('public.zc_osp_social(text,uuid,jsonb)') as social,
    to_regprocedure('public.zc_osp_shared_photo_access(uuid)') as photos
)
select
  current_database() = 'postgres' and exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20261105043101' and name = 'v076_on_spot_zone_membership'
      and cardinality(statements) = 1
      and encode(sha256(convert_to(statements[1], 'UTF8')), 'hex') =
        '4d6e5d18c2cb10c7ed4b28e4d66acf2ebd8008b776aae034766121f655f7689b'
  ) as staging_fingerprint,
  (select count(*)::int from ledger) as ledger_count,
  exists (
    select 1 from ledger where version = '${version}' and name = '${name}'
      and cardinality(statements) = 1
      and encode(sha256(convert_to(statements[1], 'UTF8')), 'hex') = '${sourceSha256}'
  ) as exact_ledger,
  (select count(*)::int from private_objects) as private_count,
  (select count(*)::int from private_objects
    where relkind = 'r' and relrowsecurity
      and not has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE')
      and not has_table_privilege('authenticated', oid, 'SELECT,INSERT,UPDATE,DELETE')
  ) as private_rls_count,
  (select count(*)::int from pg_policies
    where schemaname = 'public' and permissive = 'RESTRICTIVE'
      and (tablename, policyname) in (
        ('social_threads', 'osp_dm_block_boundary'),
        ('chat_messages', 'osp_message_pair_block'),
        ('report_photos', 'osp_photo_consent_boundary')
      )
  ) as restrictive_count,
  social is not null or photos is not null as rpc_present,
  coalesce(has_function_privilege('authenticated', social, 'EXECUTE')
    and has_function_privilege('authenticated', photos, 'EXECUTE')
    and not has_function_privilege('anon', social, 'EXECUTE')
    and not has_function_privilege('anon', photos, 'EXECUTE'), false) as rpc_acl_ok,
  to_regclass('zc_osp_internal.community_zone_reviews') is not null as community_present
from rpc;
`;

function installed(state) {
  return (
    state.staging_fingerprint === true &&
    state.ledger_count === 1 &&
    state.exact_ledger === true &&
    state.private_count === 11 &&
    state.private_rls_count === 11 &&
    state.restrictive_count === 3 &&
    state.rpc_acl_ok === true
  );
}

export async function applyOnSpotStagingMigration({ env, request, transport = fetch }) {
  if (
    env.GITHUB_ACTIONS !== "true" ||
    env.GITHUB_EVENT_NAME !== "push" ||
    env.GITHUB_REPOSITORY !== repository ||
    env.GITHUB_REF !== branch ||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? "")
  ) {
    throw new Error("Expected the protected STAGING migration workflow on its exact branch");
  }
  if (!new RegExp(`^apply ${version} to ${project} [0-9]{14}$`).test(request.trim())) {
    throw new Error("Missing the request for this exact STAGING migration");
  }
  const token = env.ZAPRUDA_STAGING_MIGRATION_TOKEN;
  if (!/^sbp_fc[A-Za-z0-9_-]+$/.test(token ?? "")) {
    throw new Error("Missing the scoped Supabase token in the protected migration environment");
  }

  async function query(queryText, readOnly) {
    const phase = readOnly ? "readback" : "apply";
    let response;
    try {
      response = await transport(endpoint, {
        method: "POST",
        redirect: "error",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ query: queryText, read_only: readOnly }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch {
      throw new Error(`Supabase ${phase} response unavailable. Check STAGING before retrying.`);
    }
    if (!response.ok) {
      throw new Error(
        `Supabase ${phase} returned HTTP ${response.status}. Check STAGING before retrying.`,
      );
    }
    if (!readOnly) return;
    let rows;
    try {
      rows = await response.json();
    } catch {
      throw new Error("Unexpected Supabase readback format");
    }
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== "object") {
      throw new Error("Unexpected Supabase readback format");
    }
    return rows[0];
  }

  const result = { project, version, name, sourceSha256, commit: env.GITHUB_SHA };
  const before = await query(stagingReadback, true);
  if (installed(before)) return { status: "ALREADY_APPLIED_VERIFIED", ...result };
  if (
    before.staging_fingerprint !== true ||
    before.ledger_count !== 0 ||
    before.private_count !== 0 ||
    before.restrictive_count !== 0 ||
    before.rpc_present !== false ||
    before.community_present !== false
  ) {
    throw new Error(
      "STAGING preflight detected an unexpected ledger, schema or project fingerprint",
    );
  }

  const generator = fileURLToPath(new URL("./on-spot-staging-apply.mjs", import.meta.url));
  const guardedSql = execFileSync(process.execPath, [generator], { encoding: "utf8", env: {} });
  await query(guardedSql, false);

  const after = await query(stagingReadback, true);
  if (!installed(after)) {
    throw new Error(
      "STAGING write returned without the expected ledger and RLS proof. Do not retry.",
    );
  }
  return { status: "STAGING_APPLIED_VERIFIED", ...result };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const request = readFileSync(
      new URL("../.github/on-spot-staging-migration.request", import.meta.url),
      "utf8",
    );
    const result = await applyOnSpotStagingMigration({ env: process.env, request });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "STAGING migration failed");
    process.exitCode = 1;
  }
}
