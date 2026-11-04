-- STAGING QA ONLY. Run as privileged test operator. Zero durable fixtures.
-- Validates DB-role RLS with temporary users; not equivalent to real network JWT.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); gid uuid; denied boolean:=false; n int;
begin
 insert into auth.users(id) values(a),(b);
 perform set_config('request.jwt.claim.sub',a::text,true);
 insert into public.meetup_posts(owner_id,country_code,region_code,city_code,title)
 values(a,'SE','QA','QA','QA RLS private') returning id into gid;
 insert into public.meetup_private_details(post_id,owner_id,private_place) values(gid,a,'QA PRIVATE');
 perform set_config('request.jwt.claim.sub',b::text,true);
 execute 'set local role authenticated';
 select count(*) into n from public.meetup_private_details where post_id=gid;
 if n<>0 then raise exception 'OUTSIDER_GPS_LEAK';end if;
 begin
  insert into public.meetup_messages(post_id,sender_id,body) values(gid,b,'not allowed');
 exception when others then denied:=true;
 end;
 if not denied then raise exception 'OUTSIDER_MESSAGE_PERMITTED';end if;
 insert into public.meetup_members(post_id,user_id) values(gid,b);
 select count(*) into n from public.meetup_private_details where post_id=gid;
 if n<>0 then raise exception 'PENDING_GPS_LEAK';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',a::text,true);
 execute 'set local role authenticated';
 update public.meetup_members set status='accepted' where post_id=gid and user_id=b;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',b::text,true);
 execute 'set local role authenticated';
 select count(*) into n from public.meetup_private_details where post_id=gid;
 if n<>1 then raise exception 'ACCEPTED_GPS_NOT_VISIBLE';end if;
end $$;
rollback;
