
-- Replace the permissive policy with a non-trivial expression, and enforce
-- via trigger that non-owners can only increment still_accurate_count by 1.
DROP POLICY IF EXISTS price_reports_confirm_accurate ON public.price_reports;

CREATE POLICY price_reports_confirm_accurate ON public.price_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.enforce_price_report_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Owners may modify their own reports freely.
  IF OLD.reported_by = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Non-owners may only increment still_accurate_count by exactly 1.
  IF NEW.still_accurate_count <> OLD.still_accurate_count + 1
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.store_name IS DISTINCT FROM OLD.store_name
     OR NEW.city IS DISTINCT FROM OLD.city
     OR NEW.price IS DISTINCT FROM OLD.price
     OR NEW.reported_by IS DISTINCT FROM OLD.reported_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only the reporter can modify this price report';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_price_report_update_trg ON public.price_reports;
CREATE TRIGGER enforce_price_report_update_trg
  BEFORE UPDATE ON public.price_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_price_report_update();
