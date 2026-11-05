-- v0.7.5 SPOT STAGING: read-only sanitized leaderboards for approved public spots.
-- No catch owner UUID, exact coordinates, evidence keys, original photos or GPS.
create or replace function public.zc_spot_public_leaderboard(
  p_spot_id uuid,
  p_league text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, zc_spot_internal
as $body$
declare result jsonb;
begin
  if (select auth.uid()) is null or
     not exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null)
  then raise exception 'Confirmed account required' using errcode='42501'; end if;

  if p_league is null or p_league not in ('street', 'ultralight') then
    raise exception 'Unsupported pilot league' using errcode='22023';
  end if;

  if p_spot_id is null or not exists(
    select 1 from public.zc_public_spots s where s.id=p_spot_id and s.state='approved'
      and s.reviewed_at is not null and p_league=any(s.disciplines)
  ) then raise exception 'Spot unavailable for league' using errcode='42501'; end if;

  select coalesce(jsonb_agg(
     jsonb_build_object(
       'title', case cat.nomination
         when 'spot-big-fish' then 'KING OF THE SPOT'
         when 'spot-longest' then 'LENGTH KING'
         when 'ul-big-fish' then 'KING OF UL'
         when 'ul-smallest' then 'MICRO KING' end,
       'nomination', cat.nomination,
       'method', cat.method,
       'species', c.species_id,
       'weight_g', c.weight_g,
       'length_mm', c.length_mm,
       'score', h.score,
       'unit', case when cat.nomination in ('spot-longest','ul-smallest') then 'mm' else 'g' end
     ) order by cat.nomination, cat.method
  ), '[]'::jsonb) into result
  from zc_spot_internal.categories cat
  join zc_spot_internal.title_holders h on h.category_id=cat.id
  join zc_spot_internal.catches c on c.id=h.catch_id
  where cat.league=p_league and cat.scope_type='spot' and cat.scope_id=p_spot_id::text
    and cat.nomination in ('spot-big-fish','spot-longest','ul-big-fish','ul-smallest')
    and c.status='verified' and c.lawful=true;

  return result;
end;
$body$;
revoke all on function public.zc_spot_public_leaderboard(uuid,text) from public,anon,authenticated;
grant execute on function public.zc_spot_public_leaderboard(uuid,text) to authenticated,service_role;
