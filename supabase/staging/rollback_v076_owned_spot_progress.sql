-- Rollback of the NEW read surface only. Does not touch catches, titles, roles or RLS.
drop function if exists public.zc_spot_my_progress();
