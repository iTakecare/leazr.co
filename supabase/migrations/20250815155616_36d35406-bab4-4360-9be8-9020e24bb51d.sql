-- Create RLS policy for anonymous access to public products
CREATE POLICY "products_public_catalog_access" 
ON public.products 
FOR SELECT 
TO anon 
USING ((active = true) AND ((admin_only = false) OR (admin_only IS NULL)));