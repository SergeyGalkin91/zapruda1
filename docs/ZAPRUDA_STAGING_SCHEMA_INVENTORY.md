# ZAPRUDA schema-only migration preflight — 2026-10-31

**Production source (READ ONLY):** `sonvniuwtvzzyuglscah`; **staging target:** `yudtbifopfnjtjanaqrd`.
No production writes, no personal rows, no secrets. Design lock `v0.6.0-admin-rc.1` unchanged.

## Read-only catalog counts confirmed
| Object class | Production |
|---|---:|
| public base tables | 61 |
| public functions | 26 |
| public RLS policies | 155 |
| public noninternal triggers | 16 |
| storage buckets | 5 |

Buckets: `avatars`, `chat-photos`, `fishing-map-photos`, `guide-verification-private`, `report-photos`.

Critical function/trigger presence confirmed: `activate_paid_club(uuid)`, `confirm_club_creation_payment(uuid,text)`, `admin_finance_summary()`, `create_paid_club_after_confirmation()`, enabled trigger `create_paid_club_after_confirmation` on `club_creation_requests`.

**Known risk**: authenticated retains EXECUTE on legacy `activate_paid_club(uuid)` in production. Draft PR #11 proposes revoke; do NOT apply to production until staging test.

## Export limitation and required artifact
Available Supabase connector allows metadata SELECT but **does not expose a schema-only dump/export operation**; do not reconstruct a complete baseline by stitching incomplete Git migrations or table metadata. Obtain a reviewed `pg_dump --schema-only --no-owner --no-privileges` from an authorized read-only database connection or equivalent Supabase schema export. Verify extensions, auth triggers, RLS, grants, storage policies, functions and trigger definitions separately. Scrub embedded secrets, JWTs, connection strings and environment settings before sharing the dump. No production table data, user records or storage files.

## Verification SQL to execute read-only on both sources after restore
```sql
select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
select count(*) from pg_policies where schemaname='public';
select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal;
select id from storage.buckets order by id;
select has_function_privilege('authenticated','public.activate_paid_club(uuid)','EXECUTE');
```

## No-go gates
Do NOT copy `auth.users`, `storage.objects`, social messages, payment records or real test accounts. Do NOT apply PR #11 before the club trigger is proven on staging. Do NOT merge PR #12 before clean check-runs on its exact HEAD and A/B/C JWT security tests. The baseline export has **not** been produced; staging is **not** schema-ready.
