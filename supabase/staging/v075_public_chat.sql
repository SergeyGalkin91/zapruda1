-- STAGING ONLY. Delta over already-applied 20261104001134 geographic chat.
-- Preserve home-country/region/city posting policies and the rate-limited RPC.
-- Never replay the adopted baseline or repurpose private social_* messages.
alter table public.chat_messages add constraint pilot_chat_message_owner unique(id,user_id);
create index pilot_chat_creator_time on public.chat_places(created_by,created_at);
create table public.chat_message_photos(
 id uuid primary key,
 message_id uuid not null unique references public.chat_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 sanitized_path text,
 sanitized_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(message_id,user_id) references public.chat_messages(id,user_id) on delete cascade,
 check(storage_path=user_id::text||'/'||message_id::text||'/'||id::text||'.jpg'),
 check((sanitized_path is null and sanitized_at is null)
 or(sanitized_path=storage_path and sanitized_at is not null))
);
create index pilot_chat_photo_owner on public.chat_message_photos(user_id);
alter table public.chat_message_photos enable row level security;
revoke all on public.chat_message_photos from public,anon,authenticated;
grant select(id,message_id,user_id,storage_path,sanitized_path,sanitized_at,created_at) on public.chat_message_photos to authenticated;
grant all on public.chat_message_photos to service_role;
create policy chat_photos_read on public.chat_message_photos for select to authenticated using(
 (sanitized_path is not null or user_id=(select auth.uid()))
 and exists(select 1 from public.chat_messages m where m.id=message_id));
create policy pilot_chat_confirmed_write on public.chat_messages as restrictive for insert
 to authenticated with check((select zapruda_internal.pilot_confirmed_actor_v075()));
create policy pilot_reaction_confirmed_write on public.chat_message_reactions as restrictive for insert
 to authenticated with check((select zapruda_internal.pilot_confirmed_actor_v075()));
-- Existing SECURITY DEFINER ensure_chat_place retains its exact contract and 5/day
-- limit. This trigger also denies unconfirmed/anonymous writes through that RPC.
create function zapruda_internal.pilot_chat_place_confirmed_v075() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.created_by is not null and not zapruda_internal.pilot_confirmed_actor_v075() then
  raise exception 'Confirmed account required' using errcode='42501';
 end if;
 return new;
end$$;
revoke all on function zapruda_internal.pilot_chat_place_confirmed_v075() from public,anon,authenticated;
create trigger pilot_chat_place_confirmed before insert on public.chat_places
 for each row execute function zapruda_internal.pilot_chat_place_confirmed_v075();
-- No original images and no direct Storage signing/read/write for API roles.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-photos','chat-photos',false,5242880,array['image/jpeg']);
create policy pilot_chat_no_direct_storage on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'chat-photos') with check(bucket_id<>'chat-photos');
-- Polling/focus refresh works without Realtime; add only this new chat table when
-- the project's publication exists. No private social_* membership is modified.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
   and schemaname='public' and tablename='chat_messages') then
  alter publication supabase_realtime add table public.chat_messages;
 end if;
end$$;
