begin;
do $qa$
declare u uuid; s uuid; c uuid; cat uuid; result jsonb;
begin
 select id into u from auth.users where email_confirmed_at is not null order by created_at limit 1;
 if u is null then raise exception 'Need confirmed staging user'; end if;
 insert into public.zc_public_spots(name,city,region,waterbody_name,disciplines,state,reviewed_at)
 values('ROLLBACK LEADERBOARD TEST','Нижний Новгород','Нижегородская область','Ока',array['street'],'approved',now())
 returning id into s;
 insert into zc_spot_internal.catches(owner_id,league,method,species_id,weight_g,length_mm,captured_at,status,lawful)
 values(u,'street','shore-spinning','pike',17000,1200,now(),'verified',true) returning id into c;
 insert into zc_spot_internal.categories(league,nomination,method,scope_type,scope_id)
 values('street','spot-big-fish','shore-spinning','spot',s::text) returning id into cat;
 insert into zc_spot_internal.title_holders(category_id,catch_id,score) values(cat,c,17000);
 perform set_config('request.jwt.claim.sub',u::text,true);
 result:=public.zc_spot_public_leaderboard(s,'street');
 if jsonb_array_length(result)<>1 or result->0->>'title'<>'KING OF THE SPOT'
  then raise exception 'Missing verified KING'; end if;
 if (result::text like '%'||u::text||'%') or (result::text like '%'||c::text||'%')
  or result::text like '%private%' or result::text like '%latitude%'
  then raise exception 'Private record fields leaked'; end if;
 begin
  perform public.zc_spot_public_leaderboard(s,'ultralight');
  raise exception 'Unapproved league was read';
 exception when insufficient_privilege then null;
 end;
end $qa$;
rollback;
select (select count(*) from zc_spot_internal.title_holders) remaining_title_fixtures;