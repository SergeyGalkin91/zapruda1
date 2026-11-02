-- STAGING fix: recipient trip organizer can accept/decline an applicant's request.
-- BEFORE UPDATE guard still enforces pending -> accepted/declined by organizer only,
-- and pending -> withdrawn by applicant only. Both parties cannot change IDs.
drop policy if exists "trip_request_update" on public.partner_trip_requests;
create policy "trip_request_update" on public.partner_trip_requests
for update to authenticated
using (
 applicant_id = (select auth.uid())
 or exists(select 1 from public.partner_trips t
   where t.id=trip_id and t.organizer_id=(select auth.uid()))
)
with check (
 applicant_id = (select auth.uid())
 or exists(select 1 from public.partner_trips t
   where t.id=trip_id and t.organizer_id=(select auth.uid()))
);
