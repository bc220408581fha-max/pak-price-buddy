
-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  monthly_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PRODUCTS (crowdsourced catalog, public)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Grocery',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read_all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_insert_auth" ON public.products FOR INSERT TO authenticated WITH CHECK (true);

-- PRICE REPORTS
CREATE TABLE public.price_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  city TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  reported_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  still_accurate_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX price_reports_product_created_idx ON public.price_reports(product_id, created_at DESC);
CREATE INDEX price_reports_created_idx ON public.price_reports(created_at DESC);
GRANT SELECT ON public.price_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_reports TO authenticated;
GRANT ALL ON public.price_reports TO service_role;
ALTER TABLE public.price_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_reports_read_all" ON public.price_reports FOR SELECT USING (true);
CREATE POLICY "price_reports_insert_own" ON public.price_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "price_reports_update_own" ON public.price_reports FOR UPDATE TO authenticated USING (auth.uid() = reported_by) WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "price_reports_delete_own" ON public.price_reports FOR DELETE TO authenticated USING (auth.uid() = reported_by);

-- RPC so any signed-in user can bump still_accurate_count without owning the row
CREATE OR REPLACE FUNCTION public.confirm_price_still_accurate(_report_id UUID)
RETURNS INTEGER
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
GRANT EXECUTE ON FUNCTION public.confirm_price_still_accurate(UUID) TO authenticated;

-- SHOPPING LISTS
CREATE TABLE public.shopping_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shopping_lists_user_idx ON public.shopping_lists(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping_lists_own" ON public.shopping_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SHOPPING LIST ITEMS
CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shopping_list_items_list_idx ON public.shopping_list_items(list_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping_list_items_own" ON public.shopping_list_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shopping_lists sl WHERE sl.id = list_id AND sl.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shopping_lists sl WHERE sl.id = list_id AND sl.user_id = auth.uid()));

-- AI MESSAGES (persistent single-thread chat per user)
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_messages_user_created_idx ON public.ai_messages(user_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_messages_own" ON public.ai_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
