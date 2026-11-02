-- STAGING ONLY. DM consent and reaction schema compatible with existing production emoji column.
create table if not exists public.social_threads (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint social_threads_distinct_users check (requester_id <> recipient_id),
 constraint social_threads_unique_request unique (requester_id,recipient_id)
);
create index if not exists social_threads_recipient_idx on public.social_threads(recipient_id);
create table if not exists public.social_messages (
 id uuid primary key default gen_random_uuid(),
 thread_id uuid not null references public.social_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 kind text not null default 'text' check (kind = 'text'),
 body text not null default '' check (char_length(body) between 1 and 2000),
 source_mark_id uuid,
 location_title text,
 latitude double precision,
 longitude double precision,
 created_at timestamptz not null default now(),
 reply_to_id uuid references public.social_messages(id),
 constraint social_messages_no_location_on_text check (source_mark_id is null and location_title is null and latitude is null and longitude is null)
);
create index if not exists social_messages_thread_created_idx on public.social_messages(thread_id,created_at);
create table if not exists public.social_message_reactions (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.social_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 emoji text not null check (emoji in ('🔥','❤️','😂','🎣','👏','🤝')),
 constraint social_message_reactions_unique unique (message_id,user_id,emoji)
);
create index if not exists social_message_reactions_message_id_idx on public.social_message_reactions(message_id);
alter table public.social_threads enable row level security;
alter table public.social_messages enable row level security;
alter table public.social_message_reactions enable row level security;
create policy "Read own invitation threads" on public.social_threads for select to authenticated using ((select auth.uid()) in (requester_id,recipient_id));
create policy "Invite only as requester" on public.social_threads for insert to authenticated with check (requester_id=(select auth.uid()) and recipient_id<>requester_id and status='pending');
create policy "Recipient responds to invitation" on public.social_threads for update to authenticated using (recipient_id=(select auth.uid()) and status='pending') with check (recipient_id=(select auth.uid()) and status in ('accepted','declined'));
create policy "Read accepted peer messages" on public.social_messages for select to authenticated using (exists(select 1 from public.social_threads t where t.id=thread_id and t.status='accepted' and (select auth.uid()) in (t.requester_id,t.recipient_id)));
create policy "Send accepted peer text messages" on public.social_messages for insert to authenticated with check (sender_id=(select auth.uid()) and kind='text' and exists(select 1 from public.social_threads t where t.id=thread_id and t.status='accepted' and (select auth.uid()) in (t.requester_id,t.recipient_id)));
create policy "Read reactions in accepted threads" on public.social_message_reactions for select to authenticated using (exists (select 1 from public.social_messages m join public.social_threads t on t.id=m.thread_id where m.id=message_id and t.status='accepted' and (select auth.uid()) in (t.requester_id,t.recipient_id)));
create policy "React to accepted thread" on public.social_message_reactions for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.social_messages m join public.social_threads t on t.id=m.thread_id where m.id=message_id and t.status='accepted' and (select auth.uid()) in (t.requester_id,t.recipient_id)));
create policy "Remove own reaction" on public.social_message_reactions for delete to authenticated using (user_id=(select auth.uid()));
revoke all on public.social_threads,public.social_messages,public.social_message_reactions from anon;
grant select,insert,update on public.social_threads to authenticated;
grant select,insert on public.social_messages to authenticated;
grant select,insert,delete on public.social_message_reactions to authenticated;
