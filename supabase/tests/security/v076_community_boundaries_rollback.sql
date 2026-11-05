-- STAGING ONLY. PostgreSQL role/claims simulation, NOT signed-JWT acceptance.
-- Uses four existing confirmed identities only within an uncommitted subtransaction.
-- The intentional ZQ001 exception rolls back every fixture before this DO returns.
do $qa$
declare
  users uuid[]; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); post uuid:=gen_random_uuid();
  uid uuid; n integer; denied boolean; complete boolean:=false;
begin
  begin
    select array_agg(id) into users from (
      select p.id from public.profiles p join auth.users u on u.id=p.id
      where u.email_confirmed_at is not null order by p.id limit 4
    ) s;
    if coalesce(array_length(users,1),0)<>4 then raise exception 'QA_FOUR_EXISTING_CONFIRMED_USERS_REQUIRED'; end if;
    insert into public.social_groups(id,name,owner_id) values
      (a,'QA_ROLLBACK_COMMUNITY_v076 A',users[1]),(b,'QA_ROLLBACK_COMMUNITY_v076 B',users[2]);
    insert into public.social_group_members(group_id,user_id,role,status) values
      (a,users[1],'member','accepted'),(b,users[2],'member','accepted'),
      (a,users[3],'member','pending'),(b,users[3],'member','accepted'),
      (a,users[4],'member','declined'),(b,users[4],'member','accepted');
    insert into public.social_group_messages(group_id,user_id,body) values
      (a,users[1],'QA rollback A'),(b,users[2],'QA rollback B');
    perform set_config('request.jwt.claim.sub',users[1]::text,true);
    execute 'set local role authenticated';
    select count(*) into n from public.social_group_messages where group_id in(a,b);
    if n<>1 then raise exception 'QA_CLUB_CROSS_GROUP_READ: %',n; end if;
    insert into public.social_group_messages(group_id,user_id,body) values(a,users[1],'QA rollback own send');
    foreach uid in array users[2:4] loop
      perform set_config('request.jwt.claim.sub',uid::text,true);
      select count(*) into n from public.social_group_messages where group_id=a;
      if n<>0 then raise exception 'QA_CLUB_FOREIGN_PENDING_DECLINED_READ'; end if;
      denied:=false;
      begin
        insert into public.social_group_messages(group_id,user_id,body) values(a,uid,'QA rejected');
      exception when insufficient_privilege then denied:=true;
      end;
      if not denied then raise exception 'QA_CLUB_FOREIGN_PENDING_DECLINED_WRITE'; end if;
    end loop;
    execute 'set local role anon';
    denied:=false;
    begin perform 1 from public.social_group_messages; exception when insufficient_privilege then denied:=true; end;
    if not denied then raise exception 'QA_CLUB_ANON_READ'; end if;
    execute 'reset role';
    perform set_config('request.jwt.claim.sub',users[1]::text,true);
    execute 'set local role authenticated';
    insert into public.meetup_posts(id,owner_id,country_code,region_code,city_code,title)
      values(post,users[1],'RU','QA','QA','QA_ROLLBACK_COMMUNITY_v076');
    foreach uid in array users[2:4] loop
      perform set_config('request.jwt.claim.sub',uid::text,true);
      insert into public.meetup_members(post_id,user_id) values(post,uid);
    end loop;
    perform set_config('request.jwt.claim.sub',users[1]::text,true);
    update public.meetup_members set status='accepted' where post_id=post and user_id in(users[2],users[3]);
    insert into public.meetup_private_details(post_id,owner_id,private_place) values(post,users[1],'Synthetic rollback fixture');
    insert into public.meetup_messages(post_id,sender_id,body) values(post,users[1],'Synthetic rollback history');
    denied:=false;
    begin update public.meetup_members set status='accepted' where post_id=post and user_id=users[4];
    exception when raise_exception then
      if sqlerrm='MEETUP_FULL' then denied:=true; else raise; end if;
    end;
    if not denied then raise exception 'QA_MEETUP_FOURTH_SEAT_ALLOWED'; end if;
    perform set_config('request.jwt.claim.sub',users[2]::text,true);
    update public.meetup_members set status='declined' where post_id=post and user_id=users[2];
    select public.meetup_occupancy(post) into n;
    if n<>2 then raise exception 'QA_MEETUP_LEAVE_DID_NOT_FREE_SEAT'; end if;
    select count(*) into n from public.meetup_private_details where post_id=post;
    if n<>0 then raise exception 'QA_MEETUP_LEFT_PRIVATE_DETAILS'; end if;
    select count(*) into n from public.meetup_messages where post_id=post;
    if n<>0 then raise exception 'QA_MEETUP_LEFT_CHAT'; end if;
    denied:=false;
    begin insert into public.meetup_messages(post_id,sender_id,body) values(post,users[2],'Forbidden');
    exception when insufficient_privilege then denied:=true; end;
    if not denied then raise exception 'QA_MEETUP_LEFT_SEND'; end if;
    perform set_config('request.jwt.claim.sub',users[1]::text,true);
    update public.meetup_members set status='accepted' where post_id=post and user_id=users[4];
    if public.meetup_occupancy(post)<>3 then raise exception 'QA_MEETUP_SEAT_NOT_REUSED'; end if;
    update public.meetup_posts set status='cancelled' where id=post;
    foreach uid in array users loop
      perform set_config('request.jwt.claim.sub',uid::text,true);
      if public.meetup_is_accepted(post) or public.meetup_occupancy(post)<>0 then raise exception 'QA_MEETUP_CANCEL_ACCESS_OR_COUNT'; end if;
      select count(*) into n from public.meetup_private_details where post_id=post;
      if n<>0 then raise exception 'QA_MEETUP_CANCEL_PRIVATE_DETAILS'; end if;
      select count(*) into n from public.meetup_messages where post_id=post;
      if n<>0 then raise exception 'QA_MEETUP_CANCEL_CHAT'; end if;
    end loop;
    execute 'reset role';
    select count(*) into n from public.meetup_messages where post_id=post;
    if n<>1 then raise exception 'QA_MEETUP_CANCEL_DESTROYED_HISTORY'; end if;
    complete:=true;
    raise exception using errcode='ZQ001',message='QA_SUCCESS_ROLLBACK';
  exception when sqlstate 'ZQ001' then
    if not complete then raise exception 'QA_INCOMPLETE'; end if;
  end;
end $qa$;
select 'PASS' result, 'PostgreSQL roles/claims; not signed JWT' test_level,
  (select count(*) from public.social_groups where name like 'QA_ROLLBACK_COMMUNITY_v076%') club_fixtures_remaining,
  (select count(*) from public.meetup_posts where title='QA_ROLLBACK_COMMUNITY_v076') meetup_fixtures_remaining;
