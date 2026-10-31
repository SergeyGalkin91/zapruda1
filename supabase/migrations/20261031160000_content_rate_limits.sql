-- Applied to live Supabase; rate limits per authenticated user, serialized by advisory transaction lock.
CREATE OR REPLACE FUNCTION public.zapruda_limit_new_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_actor uuid;
  v_count integer;
  v_limit integer;
  v_window interval;
begin
  if v_uid is null then return new; end if;
  if tg_table_name = 'partner_trips' then
    v_actor := new.organizer_id;
    v_limit := 8;
    v_window := interval '24 hours';
  elsif tg_table_name = 'chat_messages' then
    v_actor := new.user_id;
    v_limit := 15;
    v_window := interval '3 minutes';
  elsif tg_table_name = 'comments' then
    v_actor := new.user_id;
    v_limit := 10;
    v_window := interval '3 minutes';
  elsif tg_table_name = 'fishing_reports' then
    v_actor := new.user_id;
    v_limit := 5;
    v_window := interval '30 minutes';
  else
    raise exception 'unsupported rate limit target';
  end if;
  if v_actor is distinct from v_uid then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zapruda_rate:' || tg_table_name || ':' || v_uid::text, 0));
  if tg_table_name = 'partner_trips' then
    select count(*) into v_count from public.partner_trips where organizer_id = v_uid and created_at > now()-v_window;
  elsif tg_table_name = 'chat_messages' then
    select count(*) into v_count from public.chat_messages where user_id = v_uid and created_at > now()-v_window;
  elsif tg_table_name = 'comments' then
    select count(*) into v_count from public.comments where user_id = v_uid and created_at > now()-v_window;
  else
    select count(*) into v_count from public.fishing_reports where user_id = v_uid and created_at > now()-v_window;
  end if;
  if v_count >= v_limit then
    raise exception using errcode = 'P0001', message = 'Слишком много публикаций. Подожди немного перед следующей отправкой.';
  end if;
  return new;
end;
$function$

revoke all on function public.zapruda_limit_new_content() from public;
drop trigger if exists zapruda_limit_chat on public.chat_messages;
create trigger zapruda_limit_chat before insert on public.chat_messages for each row execute function public.zapruda_limit_new_content();
drop trigger if exists zapruda_limit_comments on public.comments;
create trigger zapruda_limit_comments before insert on public.comments for each row execute function public.zapruda_limit_new_content();
drop trigger if exists zapruda_limit_reports on public.fishing_reports;
create trigger zapruda_limit_reports before insert on public.fishing_reports for each row execute function public.zapruda_limit_new_content();
drop trigger if exists zapruda_limit_trips on public.partner_trips;
create trigger zapruda_limit_trips before insert on public.partner_trips for each row execute function public.zapruda_limit_new_content();
