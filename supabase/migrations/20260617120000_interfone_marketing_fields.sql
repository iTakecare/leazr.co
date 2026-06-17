-- Champs marketing optionnels par produit prestataire, pour reproduire fidèlement
-- les cartes promo (notamment interfone) sur le PDF d'offre :
--   tagline  : petit label au-dessus du nom (ex: "Smile 2", "v4", "PRO")
--   spec     : précision à côté du nom (ex: "10 GB", "Boost IA")
--   footnote : note bas de carte (ex: "* voir conditions")
-- Ajoutés sur le catalogue (external_provider_products) ET sur les snapshots
-- d'offre (offer_promo_products, offer_external_services) pour préserver
-- l'historique. Tout est nullable / IF NOT EXISTS → migration ré-exécutable.

ALTER TABLE public.external_provider_products
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS spec TEXT,
  ADD COLUMN IF NOT EXISTS footnote TEXT;

ALTER TABLE public.offer_promo_products
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS spec TEXT,
  ADD COLUMN IF NOT EXISTS footnote TEXT;

ALTER TABLE public.offer_external_services
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS spec TEXT,
  ADD COLUMN IF NOT EXISTS footnote TEXT;
