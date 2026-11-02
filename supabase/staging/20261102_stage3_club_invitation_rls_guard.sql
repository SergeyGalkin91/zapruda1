-- STAGING: allow owner invitations and invitee accept/decline, NEVER create paid clubs client-side.
-- Requires stage3_clubs_trips_minimal_rls_and_capacity_15.
create or replace function public.staging_club_invitation_transition_guard()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if old.group_id is distinct from new.group_id
     or old.user_id is distinct from new.user_id
     or old.role is distinct from new.role
     or old.invited_by is distinct from new.invited_by
     or old.created_at is distinct from new.created_at then
    raise exception 'CLUB_INVITATION_IMMUTABLE' using errcode='23514';
  end if;
  if old.role <> 'member' or old.status <> 'pending'
    or new.status not in ('accepted','declined') or new.user_id <> auth.uid() then
    raise exception 'CLUB_INVITATION_INVALID_TRANSITION' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.staging_club_invitation_transition_guard() from public, anon, authenticated;
drop trigger if exists trg_staging_club_invitation_transition_guard on public.social_group_members;
create trigger trg_staging_club_invitation_transition_guard before update on public.social_group_members
for each row execute function public.staging_club_invitation_transition_guard();

drop policy if exists "staging_club_owner_invites" on public.social_group_members;
create policy "staging_club_owner_invites" on public.social_group_members for insert to authenticated
with check (
  user_id <> (select auth.uid()) and role='member' and status='pending'
  and invited_by=(select auth.uid())
  and exists(select 1 from public.social_groups g
             where g.id=group_id and g.owner_id=(select auth.uid()))
);
drop policy if exists "staging_club_invitee_responds" on public.social_group_members;
create policy "staging_club_invitee_responds" on public.social_group_members for update to authenticated
using (user_id=(select auth.uid()) and role='member' and status='pending')
with check (user_id=(select auth.uid()) and role='member' and status in ('accepted','declined'));
grant update (status) on public.social_group_members to authenticated;
-- IMPORTANT: Owner membership and club creation are intentionally service-only until
-- verified payments. No direct social_groups INSERT, no client-created owner role.
