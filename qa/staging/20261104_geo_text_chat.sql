-- ZAPRUDA: STAGING-only geographic text chat / reactions.
-- Target project: yudtbifopfnjtjanaqrd. NOT a production auto-migration.
-- Read-only comparison against PROD schema; no user content transferred.
-- Chat photo metadata and Storage bucket intentionally NOT created: require
-- separate upload/sanitization/access gate before enabling user media.
create table public.chat_places (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.chat_places(id) on delete restrict,
  level text not null check (level in ('global','country','region','city')),
  country_code text check (country_code in ('RU','BY','KZ','AM','AZ','KG','MD','TJ','UZ','TM')),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint root_or_child check (
    (level='global' and parent_id is null and country_code is null)
    or (level<>'global' and parent_id is not null and country_code is not null)
  )
);
create unique index chat_places_unique_global on public.chat_places(level) where level='global';
create unique index chat_places_unique_country on public.chat_places(country_code) where level='country';
create unique index chat_places_unique_child on public.chat_places(parent_id,lower(btrim(name))) where parent_id is not null;
create index chat_places_by_parent on public.chat_places(parent_id,name);
create index idx_fk_chat_places_created_by on public.chat_places(created_by);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  place_id uuid not null default '00000000-0000-4000-8000-000000000001'::uuid
    references public.chat_places(id) on delete restrict,
  topic text not null default 'general'
    check(topic in ('general','reports','waters','partners','gear','tips')),
  reply_to_id uuid references public.chat_messages(id) on delete set null
);
create index chat_messages_created_at_idx on public.chat_messages(created_at desc);
create index chat_messages_place_topic_time on public.chat_messages(place_id,topic,created_at desc);
create index idx_fk_chat_messages_reply_to_id on public.chat_messages(reply_to_id);
create index idx_fk_chat_messages_user_id on public.chat_messages(user_id);

create table public.chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️','👍','🔥','😂')),
  unique(message_id,user_id)
);
create index idx_fk_chat_message_reactions_user_id on public.chat_message_reactions(user_id);

alter table public.chat_places enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_message_reactions enable row level security;

-- Project default privileges are broad; always revoke first.
revoke all privileges on public.chat_places, public.chat_messages, public.chat_message_reactions
  from public, anon, authenticated;
grant select(id,parent_id,level,country_code,name,created_by,created_at)
  on public.chat_places to authenticated;
grant select(id,user_id,body,created_at,place_id,topic,reply_to_id)
  on public.chat_messages to authenticated;
grant insert(user_id,body,place_id,topic,reply_to_id)
  on public.chat_messages to authenticated;
grant delete on public.chat_messages to authenticated;
grant select(id,message_id,user_id,emoji)
  on public.chat_message_reactions to authenticated;
grant insert(message_id,user_id,emoji) on public.chat_message_reactions to authenticated;
grant delete on public.chat_message_reactions to authenticated;

create policy "staging_geo_places_signed_in_read" on public.chat_places
 for select to authenticated using ((select auth.uid()) is not null);
create policy "staging_geo_messages_signed_in_read" on public.chat_messages
 for select to authenticated using ((select auth.uid()) is not null);
create policy "staging_geo_messages_owner_delete" on public.chat_messages
 for delete to authenticated using(user_id=(select auth.uid()));
create policy "staging_geo_messages_member_send" on public.chat_messages
 for insert to authenticated with check (
  user_id=(select auth.uid())
  and exists (
    select 1 from public.chat_places p
    join public.angler_preferences a on a.user_id=(select auth.uid())
    where p.id=chat_messages.place_id and p.level in ('country','region','city')
      and p.country_code=a.home_country_code
      and (
        p.level='country'
        or (p.level='region' and char_length(btrim(a.home_region))>0
            and lower(btrim(p.name))=lower(btrim(a.home_region)))
        or (p.level='city' and char_length(btrim(a.home_city))>0
            and lower(btrim(p.name))=lower(btrim(a.home_city))
            and exists (
              select 1 from public.chat_places parent
              where parent.id=p.parent_id and parent.level='region'
                and parent.country_code=a.home_country_code
                and (a.home_region='' or lower(btrim(parent.name))=lower(btrim(a.home_region)))
            ))
      )
  )
 );
create policy "staging_geo_reactions_read" on public.chat_message_reactions
 for select to authenticated using (
  (select auth.uid()) is not null
  and exists(select 1 from public.chat_messages m where m.id=message_id)
 );
create policy "staging_geo_reactions_insert" on public.chat_message_reactions
 for insert to authenticated with check (
  user_id=(select auth.uid())
  and exists(select 1 from public.chat_messages m where m.id=message_id)
 );
create policy "staging_geo_reactions_owner_delete" on public.chat_message_reactions
 for delete to authenticated using(user_id=(select auth.uid()));

-- Public geographic catalog configuration only: no user-generated content.
insert into public.chat_places(id,level,name)
 values('00000000-0000-4000-8000-000000000001','global','Общий чат');
insert into public.chat_places(parent_id,level,country_code,name) values
 ('00000000-0000-4000-8000-000000000001','country','RU','Россия'),
 ('00000000-0000-4000-8000-000000000001','country','BY','Беларусь'),
 ('00000000-0000-4000-8000-000000000001','country','KZ','Казахстан'),
 ('00000000-0000-4000-8000-000000000001','country','AM','Армения'),
 ('00000000-0000-4000-8000-000000000001','country','AZ','Азербайджан'),
 ('00000000-0000-4000-8000-000000000001','country','KG','Кыргызстан'),
 ('00000000-0000-4000-8000-000000000001','country','MD','Молдова'),
 ('00000000-0000-4000-8000-000000000001','country','TJ','Таджикистан'),
 ('00000000-0000-4000-8000-000000000001','country','UZ','Узбекистан'),
 ('00000000-0000-4000-8000-000000000001','country','TM','Туркменистан');

-- Region/city creation is intentionally server-only: no direct table INSERT grant.
-- A minimal, authenticated-only invoker + explicit table grant is avoided;
-- security-definer function has fixed search_path and rate-limits.
create function public.ensure_chat_place(
 p_country_code text, p_region text default null, p_city text default null
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid := auth.uid();
 v_country_id uuid;
 v_region_id uuid;
 v_city_id uuid;
 v_region text := nullif(btrim(p_region),'');
 v_city text := nullif(btrim(p_city),'');
 v_created int;
begin
 if v_uid is null then raise exception 'Войди в аккаунт.' using errcode='42501'; end if;
 if p_country_code is null or p_country_code not in ('RU','BY','KZ','AM','AZ','KG','MD','TJ','UZ','TM')
 then raise exception 'Неизвестная страна.' using errcode='22023'; end if;
 if v_city is not null and v_region is null
 then raise exception 'Сначала выбери область или регион.' using errcode='22023'; end if;
 if (v_region is not null and (char_length(v_region)<2 or char_length(v_region)>70 or v_region ~ '[[:cntrl:]<>]'))
 or (v_city is not null and (char_length(v_city)<2 or char_length(v_city)>70 or v_city ~ '[[:cntrl:]<>]'))
 then raise exception 'Проверь название региона или города (2–70 символов).' using errcode='22023'; end if;
 select id into v_country_id from public.chat_places where country_code=p_country_code and level='country';
 if v_country_id is null then raise exception 'Страна ещё не добавлена.' using errcode='22023'; end if;
 if v_region is null then return v_country_id; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('chat_place:'||v_uid::text,0));
 select id into v_region_id from public.chat_places
  where parent_id=v_country_id and lower(btrim(name))=lower(v_region) and level='region';
 if v_region_id is null then
   select count(*) into v_created from public.chat_places
    where created_by=v_uid and created_at>now()-interval '24 hours';
   if v_created>=5 then raise exception 'За сутки можно добавить до пяти новых географических разделов.' using errcode='22023'; end if;
   insert into public.chat_places(parent_id,level,country_code,name,created_by)
    values(v_country_id,'region',p_country_code,v_region,v_uid)
    on conflict do nothing returning id into v_region_id;
   if v_region_id is null then
    select id into v_region_id from public.chat_places
      where parent_id=v_country_id and lower(btrim(name))=lower(v_region) and level='region';
   end if;
 end if;
 if v_city is null then return v_region_id; end if;
 select id into v_city_id from public.chat_places
  where parent_id=v_region_id and lower(btrim(name))=lower(v_city) and level='city';
 if v_city_id is null then
   select count(*) into v_created from public.chat_places
    where created_by=v_uid and created_at>now()-interval '24 hours';
   if v_created>=5 then raise exception 'За сутки можно добавить до пяти новых географических разделов.' using errcode='22023'; end if;
   insert into public.chat_places(parent_id,level,country_code,name,created_by)
    values(v_region_id,'city',p_country_code,v_city,v_uid)
    on conflict do nothing returning id into v_city_id;
   if v_city_id is null then
    select id into v_city_id from public.chat_places
      where parent_id=v_region_id and lower(btrim(name))=lower(v_city) and level='city';
   end if;
 end if;
 return v_city_id;
end;
$$;
revoke all on function public.ensure_chat_place(text,text,text) from public,anon,authenticated;
grant execute on function public.ensure_chat_place(text,text,text) to authenticated;

-- Requires subsequent real-JWT E2E before declaring functional readiness.
