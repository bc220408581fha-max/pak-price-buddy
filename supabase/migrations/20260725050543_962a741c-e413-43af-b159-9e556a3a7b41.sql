
-- 1. Restrict products SELECT to authenticated users
DROP POLICY IF EXISTS products_read_all ON public.products;
CREATE POLICY products_read_authenticated ON public.products
  FOR SELECT TO authenticated USING (true);

-- 2. Restrict price_reports SELECT to authenticated users
DROP POLICY IF EXISTS price_reports_read_all ON public.price_reports;
CREATE POLICY price_reports_read_authenticated ON public.price_reports
  FOR SELECT TO authenticated USING (true);

-- 3. Switch confirm_price_still_accurate to SECURITY INVOKER
--    and allow any authenticated user to update only the still_accurate_count column.
REVOKE UPDATE ON public.price_reports FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.price_reports TO authenticated;
GRANT UPDATE (still_accurate_count) ON public.price_reports TO authenticated;

CREATE POLICY price_reports_confirm_accurate ON public.price_reports
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.confirm_price_still_accurate(_report_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
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
