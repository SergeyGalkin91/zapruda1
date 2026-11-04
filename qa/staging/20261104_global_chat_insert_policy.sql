-- STAGING-only: the UI explicitly offers 'Общий чат' (GLOBAL_ID).
-- The current geographic send policy rejects level=global; preserve its
-- country/region/city restrictions, and add a dedicated global-room policy.
-- The separate RESTRICTIVE pilot_chat_confirmed_write policy continues to
-- require a confirmed, non-anonymous Auth user for every INSERT.
-- Target: yudtbifopfnjtjanaqrd. Never auto-apply to production.
create policy staging_geo_messages_global_send
on public.chat_messages
as permissive
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and place_id = '00000000-0000-4000-8000-000000000001'::uuid
  and exists (
    select 1 from public.chat_places p
    where p.id = chat_messages.place_id
      and p.level = 'global'
  )
);
