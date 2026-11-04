-- ZAPRUDA STAGING-only admin role lookup table (empty).
-- Target: yudtbifopfnjtjanaqrd. DO NOT add to production migration chain.
-- Does NOT appoint or grant admin privileges to any account.
-- Mirrors metadata-only production schema for Shell and admin-route role checks.
create table public.zapruda_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.zapruda_admins enable row level security;

-- Supabase default ACL may be permissive: explicitly revoke before granting.
revoke all on public.zapruda_admins from PUBLIC, anon, authenticated;
grant select (user_id) on public.zapruda_admins to authenticated;

create policy staging_admin_read_own_membership on public.zapruda_admins
 for select to authenticated
 using (user_id=(select auth.uid()));

-- No API INSERT/UPDATE/DELETE/REFERENCES/TRUNCATE privileges.
-- No membership rows are inserted. Admin provisioning is a separate review gate.
