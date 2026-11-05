-- STAGING delta only; prerequisites already inventoried. No title awards or table grants.
-- This no-argument RPC is the only new read surface; it cannot select another actor.
create function public.zc_spot_my_progress()
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, zc_spot_internal, auth
as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null or not exists (
    select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous,false)=false
  ) then raise exception 'Confirmed account required' using errcode='42501'; end if;

  with mine as (
    select c.id,c.league,c.species_id,c.weight_g,c.length_mm,c.status,c.created_at
    from zc_spot_internal.catches c where c.owner_id=actor
    order by c.created_at desc,c.id limit 100
  ), current_titles as (
    select k.id as category_id,h.catch_id,k.nomination,k.league,h.score,h.updated_at
    from zc_spot_internal.title_holders h
    join zc_spot_internal.categories k on k.id=h.category_id
    join zc_spot_internal.catches c on c.id=h.catch_id
    where c.owner_id=actor and c.status='verified' and c.lawful=true
      and k.league=c.league and k.method=c.method
      and k.nomination in ('spot-big-fish','spot-longest','ul-big-fish','ul-smallest','carp-big-fish','ice-big-fish','boat-big-fish')
      and (k.league<>'ultralight' or c.ul_gear_approved=true)
      and (k.nomination<>'ul-smallest' or c.micro_welfare_approved=true)
      and exists(select 1 from zc_spot_internal.capture_scopes s where s.catch_id=c.id
        and s.scope_type=k.scope_type and s.scope_id=k.scope_id and s.approved=true)
      and exists(select 1 from zc_spot_internal.evidence e join storage.objects o
        on o.bucket_id='zc-spot-evidence-staging' and o.name=e.private_storage_key
        and o.is_delete_marker=false where e.catch_id=c.id and e.approved=true)
      and (k.scope_type<>'spot' or exists(select 1 from public.zc_public_spots p
        where p.id::text=k.scope_id and p.state='approved' and p.reviewed_at is not null
          and k.league=any(p.disciplines)))
    order by h.updated_at desc,k.id limit 100
  ), own_history as (
    select h.id::text as event_id,k.nomination,h.changed_at,
      case when oldc.owner_id=actor and newc.owner_id=actor then 'updated'
           when newc.owner_id=actor then 'received' else 'ended' end as event
    from zc_spot_internal.title_history h
    join zc_spot_internal.categories k on k.id=h.category_id
    left join zc_spot_internal.catches oldc on oldc.id=h.old_catch_id
    left join zc_spot_internal.catches newc on newc.id=h.new_catch_id
    where (oldc.owner_id=actor or newc.owner_id=actor)
      and k.nomination in ('spot-big-fish','spot-longest','ul-big-fish','ul-smallest','carp-big-fish','ice-big-fish','boat-big-fish')
    order by h.changed_at desc,h.id desc limit 100
  ) select jsonb_build_object(
    'catches',coalesce((select jsonb_agg(jsonb_build_object('catch_id',m.id,'league',m.league,
      'species',m.species_id,'weight_g',m.weight_g,'length_mm',m.length_mm,
      'status',m.status,'created_at',m.created_at) order by m.created_at desc,m.id) from mine m),'[]'::jsonb),
    'titles',coalesce((select jsonb_agg(jsonb_build_object('category_id',t.category_id,'catch_id',t.catch_id,
      'nomination',t.nomination,'league',t.league,'score',t.score,
      'unit',case when t.nomination in ('spot-longest','ul-smallest') then 'mm' else 'g' end,
      'updated_at',t.updated_at) order by t.updated_at desc,t.category_id) from current_titles t),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('event_id',h.event_id,'nomination',h.nomination,
      'event',h.event,'changed_at',h.changed_at) order by h.changed_at desc,h.event_id) from own_history h),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.zc_spot_my_progress() from public,anon,authenticated;
grant execute on function public.zc_spot_my_progress() to authenticated;
comment on function public.zc_spot_my_progress() is
  'STAGING owner-only catch/title/history read; no GPS, original evidence, foreign identity, award or moderator grant.';
