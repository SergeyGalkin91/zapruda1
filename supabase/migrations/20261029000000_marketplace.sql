-- ZAPRUDA marketplace
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in ('Спиннинги','Катушки','Приманки','Эхолоты','Экипировка','Лодки и моторы','Отдам даром','Другое')),
  price_rub integer not null default 0 check (price_rub >= 0),
  condition text not null default 'Б/у · хорошее' check (condition in ('Новое','Б/у · отличное','Б/у · хорошее','Б/у · есть следы','На запчасти')),
  city text not null default '' check (char_length(city) <= 100),
  photo_url text,
  status text not null default 'active' check (status in ('active','sold','hidden')),
  created_at timestamptz not null default now()
);
create index if not exists market_listings_status_created_idx on public.market_listings(status, created_at desc);
create index if not exists market_listings_category_idx on public.market_listings(category);
alter table public.market_listings enable row level security;
drop policy if exists "Public can view active market listings" on public.market_listings;
create policy "Public can view active market listings" on public.market_listings for select using (status = 'active' or user_id = auth.uid());
drop policy if exists "Users create own market listings" on public.market_listings;
create policy "Users create own market listings" on public.market_listings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users update own market listings" on public.market_listings;
create policy "Users update own market listings" on public.market_listings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users delete own market listings" on public.market_listings;
create policy "Users delete own market listings" on public.market_listings for delete to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('market-photos', 'market-photos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "Public read market photos" on storage.objects;
create policy "Public read market photos" on storage.objects for select using (bucket_id = 'market-photos');
drop policy if exists "Users upload market photos" on storage.objects;
create policy "Users upload market photos" on storage.objects for insert to authenticated with check (bucket_id = 'market-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own market photos" on storage.objects;
create policy "Users delete own market photos" on storage.objects for delete to authenticated using (bucket_id = 'market-photos' and (storage.foldername(name))[1] = auth.uid()::text);
