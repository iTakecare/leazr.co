-- Créer les clés étrangères manquantes pour permettre les jointures Supabase

-- 1. Ajouter la clé étrangère entre product_pack_items et products
ALTER TABLE public.product_pack_items 
ADD CONSTRAINT fk_product_pack_items_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) 
ON DELETE CASCADE;

-- 2. Ajouter la clé étrangère entre product_pack_items et product_variant_prices
ALTER TABLE public.product_pack_items 
ADD CONSTRAINT fk_product_pack_items_variant_price_id 
FOREIGN KEY (variant_price_id) REFERENCES public.product_variant_prices(id) 
ON DELETE SET NULL;

-- 3. Ajouter la clé étrangère entre product_pack_items et product_packs
ALTER TABLE public.product_pack_items 
ADD CONSTRAINT fk_product_pack_items_pack_id 
FOREIGN KEY (pack_id) REFERENCES public.product_packs(id) 
ON DELETE CASCADE;

-- 4. Vérifier les politiques RLS pour product_pack_items
-- S'assurer que les utilisateurs peuvent accéder aux pack items de leur entreprise
DROP POLICY IF EXISTS "product_pack_items_company_access" ON public.product_pack_items;

CREATE POLICY "product_pack_items_company_access"
ON public.product_pack_items
FOR ALL
USING (
  pack_id IN (
    SELECT id FROM public.product_packs 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
)
WITH CHECK (
  pack_id IN (
    SELECT id FROM public.product_packs 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- 5. Vérifier les politiques RLS pour product_variant_prices
-- S'assurer que les utilisateurs peuvent accéder aux prix des variants de leur entreprise
DROP POLICY IF EXISTS "product_variant_prices_company_access" ON public.product_variant_prices;

CREATE POLICY "product_variant_prices_company_access"
ON public.product_variant_prices
FOR ALL
USING (
  product_id IN (
    SELECT id FROM public.products 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
)
WITH CHECK (
  product_id IN (
    SELECT id FROM public.products 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);