-- ZAPRUDA: server-side contract for approximate coordinates.
--
-- The CHECK added in 20261102000100 (PR #34) forbids exact lat/lng on public
-- reports but does not cover approximate_latitude/approximate_longitude.
-- With 6 decimal places those fields are de facto exact coordinates.
--
-- Contract:
--  1. approximate_latitude/approximate_longitude are stored rounded to
--     2 decimal places (~1.1 km, "water district" precision). The value
--     is a product decision; 2 dp is the safer default.
--  2. Exact coordinates may exist only in public.report_private_locations
--     (no Data API grant; live probe 2026-11-02 returned 401) and in the
--     future permission entity from PR #35 (owner_id, audience, precision,
--     expires_at, revoked_at). This trigger does not affect that system:
--     it only touches the approximate fields of fishing_reports.
--  3. Rounding happens on the server (BEFORE trigger), so a client cannot
--     bypass it through a direct REST request.
--  4. The CHECK from PR #34 stays in force: is_public=true requires NULL
--     latitude/longitude.

create or replace function public.zapruda_round_approximate_coords()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.approximate_latitude is not null then
    new.approximate_latitude := round(new.approximate_latitude::numeric, 2);
  end if;
  if new.approximate_longitude is not null then
    new.approximate_longitude := round(new.approximate_longitude::numeric, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists fishing_reports_round_approx_coords
  on public.fishing_reports;
create trigger fishing_reports_round_approx_coords
  before insert or update on public.fishing_reports
  for each row execute function public.zapruda_round_approximate_coords();
