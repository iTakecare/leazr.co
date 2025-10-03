-- Fix Security Definer issue on views
-- Les vues doivent utiliser SECURITY INVOKER pour appliquer les RLS du querying user

DROP VIEW IF EXISTS public.product_packs_public;
DROP VIEW IF EXISTS public.product_pack_items_public;

-- Recréer les vues avec SECURITY INVOKER
CREATE VIEW public.product_packs_public
WITH (security_invoker = true) AS
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
  total_monthly_price,
  pack_monthly_price,
  pack_promo_price,
  promo_active,
  promo_valid_from,
  promo_valid_to
FROM public.product_packs
WHERE is_active = true AND admin_only = false;

CREATE VIEW public.product_pack_items_public
WITH (security_invoker = true) AS
SELECT 
  ppi.id,
  ppi.pack_id,
  ppi.product_id,
  ppi.variant_price_id,
  ppi.quantity,
  ppi.position,
  ppi.created_at
FROM public.product_pack_items ppi
INNER JOIN public.product_packs pp ON ppi.pack_id = pp.id
WHERE pp.is_active = true AND pp.admin_only = false;

-- Autoriser l'accès public aux vues
GRANT SELECT ON public.product_packs_public TO anon, authenticated;
GRANT SELECT ON public.product_pack_items_public TO anon, authenticated;

COMMENT ON VIEW public.product_packs_public IS 'Vue publique sécurisée des packs - exclut les prix d''achat et marges';
COMMENT ON VIEW public.product_pack_items_public IS 'Vue publique sécurisée des items de packs - exclut les prix d''achat et marges';