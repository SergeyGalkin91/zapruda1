-- Initial ZAPRUDA administrator. Only bootstrap when exactly one
-- registered, verified, non-anonymous account exists. Never automatically
-- promote additional users after launch.
do $$
declare owner_id uuid;
begin
 if (select count(*) from auth.users) <> 1 then
  raise exception 'Cannot bootstrap administrator: multiple accounts exist';
 end if;
 select id into owner_id from auth.users
  where email_confirmed_at is not null and is_anonymous is distinct from true;
 if owner_id is null then
  raise exception 'Cannot bootstrap administrator: verified owner absent';
 end if;
 insert into public.zapruda_admins(user_id) values(owner_id)
 on conflict(user_id) do nothing;
end $$;
