-- STAGING-only until QA; protect approximate report locations from precision leaks.
CREATE OR REPLACE FUNCTION public.zapruda_round_approximate_coords()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.approximate_latitude IS NOT NULL THEN
    NEW.approximate_latitude := round(NEW.approximate_latitude::numeric, 2);
  END IF;
  IF NEW.approximate_longitude IS NOT NULL THEN
    NEW.approximate_longitude := round(NEW.approximate_longitude::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS fishing_reports_round_approx_coords ON public.fishing_reports;
CREATE TRIGGER fishing_reports_round_approx_coords
  BEFORE INSERT OR UPDATE ON public.fishing_reports
  FOR EACH ROW EXECUTE FUNCTION public.zapruda_round_approximate_coords();
