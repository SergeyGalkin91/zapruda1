-- STAGING-only follows table, target yudtbifopfnjtjanaqrd.
-- Never deploy automatically to production.
create table public.follows (
 follower_id uuid not null references public.profiles(id) on delete cascade,
 following_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,following_id),
 constraint follows_check check(follower_id<>following_id)
);
create index follows_target_idx on public.follows(following_id);
alter table public.follows enable row level security;
revoke all privileges on public.follows from PUBLIC,anon,authenticated;
grant select(follower_id,following_id,created_at) on public.follows to authenticated;
grant insert(follower_id,following_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;
create policy staging_follows_read on public.follows for select to authenticated
 using ((select auth.uid()) is not null);
create policy staging_follows_add_own on public.follows for insert to authenticated
 with check (follower_id=(select auth.uid()));
create policy staging_follows_remove_own on public.follows for delete to authenticated
 using (follower_id=(select auth.uid()));
