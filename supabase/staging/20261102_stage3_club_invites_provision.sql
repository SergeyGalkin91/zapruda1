-- STAGING only. Server enforcement for paid-club provision and member invitations.
-- Payment provider integration is NOT present: service_role must verify transaction externally BEFORE marking payment as paid.
create or replace function public.provision_verified_paid_club(p_request_id uuid)
returns uuid language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare req public.club_creation_requests%rowtype; new_group uuid;
begin
 if current_user <> 'service_role' then
   raise exception 'Service role only' using errcode='42501';
 end if;
 select * into req from public.club_creation_requests where id=p_request_id for update;
 if not found then raise exception 'Request not found'; end if;
 if req.status <> 'paid' or req.admin_approved is not true or nullif(btrim(req.payment_reference),'') is null then
   raise exception 'Verified payment and administrative approval are required';
 end if;
 insert into public.social_groups(name,description,city,owner_id,source_request_id)
 values(req.name,req.description,req.city,req.applicant_id,req.id)
 on conflict (source_request_id) do nothing returning id into new_group;
 if new_group is null then
   select id into new_group from public.social_groups where source_request_id=req.id;
 end if;
 insert into public.social_group_members(group_id,user_id,role,status,invited_by)
 values(new_group,req.applicant_id,'owner','accepted',null)
 on conflict(group_id,user_id) do nothing;
 return new_group;
end $$;
revoke all on function public.provision_verified_paid_club(uuid) from public,anon,authenticated;
grant execute on function public.provision_verified_paid_club(uuid) to service_role;

create or replace function public.staging_club_member_transition_guard()
returns trigger language plpgsql security invoker
set search_path=pg_catalog,public as $$
begin
 if old.group_id is distinct from new.group_id or old.user_id is distinct from new.user_id
    or old.role is distinct from new.role or old.invited_by is distinct from new.invited_by
    or old.created_at is distinct from new.created_at then
    raise exception 'Club membership immutable fields' using errcode='42501';
 end if;
 if old.role <> 'member' or old.status <> 'pending'
   or new.status not in ('accepted','declined')
   or auth.uid() is distinct from old.user_id then
   raise exception 'Only invited user can answer pending invitation' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.staging_club_member_transition_guard() from public,anon,authenticated;
drop trigger if exists trg_staging_club_member_transition on public.social_group_members;
create trigger trg_staging_club_member_transition before update on public.social_group_members
for each row execute function public.staging_club_member_transition_guard();

grant insert on public.social_group_members to authenticated;
grant update(status) on public.social_group_members to authenticated;
drop policy if exists "owner_invites_members" on public.social_group_members;
create policy "owner_invites_members" on public.social_group_members for insert to authenticated
with check (
 user_id <> (select auth.uid()) and role='member' and status='pending'
 and invited_by=(select auth.uid())
 and exists (select 1 from public.social_groups g
             where g.id=group_id and g.owner_id=(select auth.uid()))
);
drop policy if exists "invitee_answers" on public.social_group_members;
create policy "invitee_answers" on public.social_group_members for update to authenticated
using(user_id=(select auth.uid()) and role='member' and status='pending')
with check(user_id=(select auth.uid()) and role='member' and status in ('accepted','declined'));
