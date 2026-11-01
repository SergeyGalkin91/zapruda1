-- ZAPRUDA: column-level access to profiles.
--
-- Public profile fields stay readable to everyone (feed authors, comments,
-- chat, search, partner pages); personal fields (bio, created_at,
-- avatar_symbol) become readable only by the owner via my_profile_full();
-- chat_city is readable by signed-in members because the chat shows it and
-- the owner explicitly opts in (shareChatCity) before it is stored.

-- Table-wide SELECT allows reading every column of every row; RLS is
-- row-level only and cannot hide columns. Replace it with column grants.
revoke select on table public.profiles from anon, authenticated;

-- Public fields: everyone (including anonymous visitors).
grant select (id, username, display_name, avatar_url)
  on table public.profiles to anon, authenticated;

-- chat_city: signed-in members only (written solely on owner opt-in).
grant select (id, username, display_name, avatar_url, chat_city)
  on table public.profiles to authenticated;

-- Full own row via a SECURITY DEFINER function. The where clause is pinned
-- to auth.uid(), so it can never return another user's profile.
create or replace function public.my_profile_full()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = (select auth.uid());
$$;

revoke all on function public.my_profile_full() from public, anon;
grant execute on function public.my_profile_full() to authenticated;

-- UPDATE limited to the columns the app actually writes; id and created_at
-- are no longer writable through the Data API.
revoke update on table public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, bio, chat_city, avatar_symbol)
  on table public.profiles to authenticated;
