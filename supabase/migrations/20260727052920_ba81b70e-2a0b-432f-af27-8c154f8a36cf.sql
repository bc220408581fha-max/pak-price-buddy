CREATE OR REPLACE FUNCTION public.confirm_price_still_accurate(_report_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.price_reports
    SET still_accurate_count = still_accurate_count + 1
    WHERE id = _report_id
    RETURNING still_accurate_count INTO new_count;
  RETURN new_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_price_still_accurate(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_price_still_accurate(uuid) TO service_role;