-- Stage 2: reactions on private (social) messages.
-- Apply on STAGING first. Do not run on production without owner approval.

create table if not exists public.social_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.social_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction_type text not null check (reaction_type in ('fire', 'heart', 'laugh', 'fish', 'clap', 'support')),
  created_at timestamptz not null default now(),
  constraint social_message_reactions_unique unique (message_id, user_id, reaction_type)
);

create index if not exists social_message_reactions_message_id_idx
  on public.social_message_reactions (message_id);

alter table public.social_message_reactions enable row level security;

drop policy if exists "Thread peers can read social message reactions" on public.social_message_reactions;
create policy "Thread peers can read social message reactions"
  on public.social_message_reactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.social_messages m
      join public.social_threads t on t.id = m.thread_id
      where m.id = social_message_reactions.message_id
        and t.status = 'accepted'
        and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())
    )
  );

drop policy if exists "Thread peers can add social message reactions" on public.social_message_reactions;
create policy "Thread peers can add social message reactions"
  on public.social_message_reactions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.social_messages m
      join public.social_threads t on t.id = m.thread_id
      where m.id = social_message_reactions.message_id
        and t.status = 'accepted'
        and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())
    )
  );

drop policy if exists "Users can remove own social message reactions" on public.social_message_reactions;
create policy "Users can remove own social message reactions"
  on public.social_message_reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.social_message_reactions to authenticated;
