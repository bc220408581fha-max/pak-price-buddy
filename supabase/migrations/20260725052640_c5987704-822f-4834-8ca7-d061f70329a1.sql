
DROP POLICY IF EXISTS price_reports_confirm_accurate ON public.price_reports;
DROP TRIGGER IF EXISTS enforce_price_report_update_trg ON public.price_reports;
REVOKE UPDATE (still_accurate_count) ON public.price_reports FROM authenticated;

CREATE OR REPLACE FUNCTION public.confirm_price_still_accurate(_report_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.price_reports
    SET still_accurate_count = still_accurate_count + 1
    WHERE id = _report_id
    RETURNING still_accurate_count INTO new_count;
  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_price_still_accurate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_price_still_accurate(uuid) TO authenticated;
