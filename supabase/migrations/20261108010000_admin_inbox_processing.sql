-- Dispatch claim is only written by the service backend.
alter table public.admin_inbox_submissions
  drop constraint if exists admin_inbox_submissions_delivery_status_check;
alter table public.admin_inbox_submissions
  add constraint admin_inbox_submissions_delivery_status_check
  check (delivery_status in ('queued','processing','sent','failed'));
