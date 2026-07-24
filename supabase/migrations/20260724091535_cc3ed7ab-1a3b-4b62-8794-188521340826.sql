
-- Hide internal SECURITY DEFINER helpers from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- set_updated_at doesn't need elevated privileges; use INVOKER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- The confirm_price_still_accurate function must stay SECURITY DEFINER
-- (so any signed-in user can bump a counter on rows they don't own),
-- but restrict execution to authenticated only (already granted; revoke from anon/public).
REVOKE ALL ON FUNCTION public.confirm_price_still_accurate(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_price_still_accurate(UUID) TO authenticated;
