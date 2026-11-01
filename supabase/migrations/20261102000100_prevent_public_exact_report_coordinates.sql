-- Alpha safety invariant: never publish exact fishing spots in the public reports table.
-- Private precision belongs exclusively in public.report_private_locations (owner-RLS).
-- Row-level SELECT policies alone do not hide latitude/longitude columns.
-- STAGING inventory checked 2026-11-02: no public rows with exact coordinates.
ALTER TABLE public.fishing_reports
  ADD CONSTRAINT fishing_reports_public_no_exact_coords
  CHECK (
    is_public IS DISTINCT FROM TRUE
    OR (latitude IS NULL AND longitude IS NULL)
  );
