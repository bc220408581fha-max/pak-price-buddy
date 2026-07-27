REVOKE ALL ON FUNCTION public.confirm_price_still_accurate(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_price_still_accurate(uuid) TO service_role;