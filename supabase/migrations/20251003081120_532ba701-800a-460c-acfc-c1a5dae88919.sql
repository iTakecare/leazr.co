-- Sécurisation des tables product_packs et product_pack_items
-- Problème : Les policies actuelles exposent des données sensibles (marges, prix d'achat) au public

-- 1. Supprimer les policies de lecture publique actuelles
DROP POLICY IF EXISTS "product_packs_public_read" ON public.product_packs;
DROP POLICY IF EXISTS "product_pack_items_public_read" ON public.product_pack_items;

-- 2. Créer des vues sécurisées pour l'accès public (sans données sensibles)
CREATE OR REPLACE VIEW public.product_packs_public AS
SELECT 
  id,
  company_id,
  name,
  description,
  image_url,
  is_active,
  is_featured,
  admin_only,
  created_at,
  updated_at,
  leaser_id,
  selected_duration,
  -- Prix public uniquement (pas de prix d'achat ni marges)
  total_monthly_price,
  pack_monthly_price,
  pack_promo_price,
  promo_active,
  promo_valid_from,
  promo_valid_to
  -- Pas de: total_purchase_price, total_margin
FROM public.product_packs
WHERE is_active = true AND admin_only = false;

CREATE OR REPLACE VIEW public.product_pack_items_public AS
SELECT 
  ppi.id,
  ppi.pack_id,
  ppi.product_id,
  ppi.variant_price_id,
  ppi.quantity,
  ppi.position,
  ppi.created_at
  -- Pas de: unit_purchase_price, unit_monthly_price, margin_percentage
FROM public.product_pack_items ppi
INNER JOIN public.product_packs pp ON ppi.pack_id = pp.id
WHERE pp.is_active = true AND pp.admin_only = false;

-- 3. Autoriser l'accès public aux vues (sans données sensibles)
GRANT SELECT ON public.product_packs_public TO anon, authenticated;
GRANT SELECT ON public.product_pack_items_public TO anon, authenticated;

-- 4. Les policies company_access restent inchangées pour l'accès complet authentifié
-- product_packs_company_isolation et product_pack_items_company_access permettent
-- l'accès complet aux utilisateurs de l'entreprise et admins

COMMENT ON VIEW public.product_packs_public IS 'Vue publique sécurisée des packs - exclut les prix d''achat et marges';
COMMENT ON VIEW public.product_pack_items_public IS 'Vue publique sécurisée des items de packs - exclut les prix d''achat et marges';