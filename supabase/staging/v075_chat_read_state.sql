-- STAGING ONLY, additive; never replay the geographic baseline.
create table public.chat_read_state (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 place_id uuid not null references public.chat_places(id) on delete cascade,
 topic text not null check(topic in ('general','reports','waters','partners','gear','tips')),
 last_read_at timestamptz not null default '-infinity',
 primary key(user_id,place_id,topic)
);
alter table public.chat_read_state enable row level security;
revoke all on public.chat_read_state from public,anon,authenticated;
grant select,insert,update on public.chat_read_state to authenticated;
create policy own_read_state on public.chat_read_state to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (select zapruda_internal.pilot_confirmed_actor_v075()));
-- No writable timestamp from the client: the RPC resolves a visible message.
revoke insert,update on public.chat_read_state from authenticated;
grant insert(user_id,place_id,topic,last_read_at),update(last_read_at) on public.chat_read_state to authenticated;
-- Direct writes cannot skip past server time or move a watermark backwards.
create function zapruda_internal.chat_read_state_guard() returns trigger
language plpgsql security invoker set search_path='' as $$begin
 if not exists(select 1 from public.chat_places p where p.id=new.place_id) then raise exception 'Unknown chat'; end if;
 if new.last_read_at > now() then raise exception 'Future read marker'; end if;
 if tg_op='UPDATE' then new.last_read_at=greatest(old.last_read_at,new.last_read_at); end if;
 return new;
end$$;
revoke all on function zapruda_internal.chat_read_state_guard() from public,anon,authenticated;
create trigger chat_read_state_guard before insert or update on public.chat_read_state
 for each row execute function zapruda_internal.chat_read_state_guard();
create function public.mark_chat_read(p_place uuid,p_topic text,p_message uuid default null) returns void
language plpgsql security invoker set search_path='' as $$declare stamp timestamptz;begin
 if auth.uid() is null or not zapruda_internal.pilot_confirmed_actor_v075() then raise exception 'Confirmed account required' using errcode='42501'; end if;
 if p_message is null then stamp='-infinity';
 else select created_at into strict stamp from public.chat_messages where id=p_message and place_id=p_place and topic=p_topic; end if;
 insert into public.chat_read_state(user_id,place_id,topic,last_read_at) values(auth.uid(),p_place,p_topic,stamp)
 on conflict(user_id,place_id,topic) do update set last_read_at=greatest(chat_read_state.last_read_at,excluded.last_read_at);
end$$;
revoke all on function public.mark_chat_read(uuid,text,uuid) from public,anon;
grant execute on function public.mark_chat_read(uuid,text,uuid) to authenticated;
create function public.chat_room_read_summary(p_place uuid) returns table(topic text,joined boolean,unread bigint)
language sql stable security invoker set search_path='' as $$
 select t.topic,r.user_id is not null,count(m.id) filter(where m.user_id<>auth.uid() and m.created_at>coalesce(r.last_read_at,'-infinity'::timestamptz))
 from unnest(array['general','reports','waters','partners','gear','tips']) t(topic)
 left join public.chat_read_state r on r.user_id=auth.uid() and r.place_id=p_place and r.topic=t.topic
 left join public.chat_messages m on m.place_id=p_place and m.topic=t.topic
 where auth.uid() is not null group by t.topic,r.user_id
$$;
revoke all on function public.chat_room_read_summary(uuid) from public,anon;
grant execute on function public.chat_room_read_summary(uuid) to authenticated;
notify pgrst,'reload schema';
