
DROP POLICY IF EXISTS "products_insert_auth" ON public.products;
CREATE POLICY "products_insert_auth" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
