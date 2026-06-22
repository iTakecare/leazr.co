-- SKU ITC : SKU propre au tenant pour transmettre les listes d'équipement aux fournisseurs.
-- NB: appliqué en prod via la Supabase Management API (historique migrations désynchronisé).
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS sku_prefix text;
ALTER TABLE public.products  ADD COLUMN IF NOT EXISTS sku_itc text;
CREATE INDEX IF NOT EXISTS idx_products_sku_itc ON public.products (company_id, sku_itc);
