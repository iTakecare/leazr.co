-- Create RLS policy for anonymous access to product variant prices
CREATE POLICY "product_variant_prices_public_catalog_access" 
ON public.product_variant_prices 
FOR SELECT 
TO anon 
USING (product_id IN (
  SELECT id FROM public.products 
  WHERE active = true 
  AND (admin_only = false OR admin_only IS NULL)
));