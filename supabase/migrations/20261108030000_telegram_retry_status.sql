alter table public.community_requests
 drop constraint if exists community_requests_telegram_status_check;
alter table public.community_requests
 add constraint community_requests_telegram_status_check
 check (telegram_status in ('pending','processing','sent','failed'));
comment on column public.community_requests.telegram_status is
 'pending or failed: admin may retry; processing: currently claimed; sent: Telegram API confirmed. An interrupted processing state needs controlled recovery.';
