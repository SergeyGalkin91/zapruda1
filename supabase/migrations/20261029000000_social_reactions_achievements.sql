-- Social features for ZAPRUDA: reactions on comments/chat, chat messages, profile achievements.
-- Apply this migration in the Supabase SQL Editor before enabling cross-device persistence.

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like','fire','laugh','fish','clap','support','heart','mind_blown','muscle')),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, reaction_type)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at desc);

create table if not exists public.chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like','fire','laugh','fish','clap','support','heart','mind_blown','muscle')),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, reaction_type)
);

create table if not exists public.profile_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null check (achievement_code in ('first_cast','first_catch','report_photographer','hot_streak','trophy','community_favorite')),
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_code)
);

alter table public.comment_reactions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.profile_achievements enable row level security;

drop policy if exists "Authenticated users can read comment reactions" on public.comment_reactions;
create policy "Authenticated users can read comment reactions"
  on public.comment_reactions for select to authenticated using (true);
drop policy if exists "Users can add their own comment reactions" on public.comment_reactions;
create policy "Users can add their own comment reactions"
  on public.comment_reactions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own comment reactions" on public.comment_reactions;
create policy "Users can remove their own comment reactions"
  on public.comment_reactions for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read chat messages" on public.chat_messages;
create policy "Authenticated users can read chat messages"
  on public.chat_messages for select to authenticated using (true);
drop policy if exists "Users can send their own chat messages" on public.chat_messages;
create policy "Users can send their own chat messages"
  on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own chat messages" on public.chat_messages;
create policy "Users can delete their own chat messages"
  on public.chat_messages for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read chat reactions" on public.chat_reactions;
create policy "Authenticated users can read chat reactions"
  on public.chat_reactions for select to authenticated using (true);
drop policy if exists "Users can add their own chat reactions" on public.chat_reactions;
create policy "Users can add their own chat reactions"
  on public.chat_reactions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own chat reactions" on public.chat_reactions;
create policy "Users can remove their own chat reactions"
  on public.chat_reactions for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can read their own achievements" on public.profile_achievements;
create policy "Users can read their own achievements"
  on public.profile_achievements for select to authenticated using (auth.uid() = user_id);

-- Existing report reactions are also unique per user and reaction, preventing duplicate taps.
create unique index if not exists reactions_report_user_type_unique
  on public.reactions(report_id, user_id, reaction_type);
