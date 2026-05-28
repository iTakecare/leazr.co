-- Carte promo "Avez-vous pensé à...?" : produits prestataires externes ajoutés à
-- une offre en mode promotionnel (suggestions). Concept DISTINCT des services
-- partenaires complémentaires (offer_external_services). Ces lignes n'entrent
-- jamais dans les totaux/mensualités de l'offre — elles servent uniquement à
-- l'affichage d'une carte promo sur le PDF. Snapshots en texte (provider_name,
-- provider_logo_url, etc.) pour que les offres historiques restent lisibles même
-- si le catalogue prestataire change.

-- 1. Table
CREATE TABLE IF NOT EXISTS public.offer_promo_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  provider_id text,
  provider_name text NOT NULL,
  provider_logo_url text,
  product_id text,
  product_name text NOT NULL,
  description text,
  price_htva numeric NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly',
  quantity integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.offer_promo_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promo products for their company offers"
  ON public.offer_promo_products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.profiles p ON p.company_id = o.company_id
      WHERE o.id = offer_promo_products.offer_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert promo products for their company offers"
  ON public.offer_promo_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.profiles p ON p.company_id = o.company_id
      WHERE o.id = offer_promo_products.offer_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete promo products for their company offers"
  ON public.offer_promo_products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.profiles p ON p.company_id = o.company_id
      WHERE o.id = offer_promo_products.offer_id
        AND p.id = auth.uid()
    )
  );

-- Service role bypass for edge functions / PDF generators using the service key
CREATE POLICY "Service role full access on offer_promo_products"
  ON public.offer_promo_products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_offer_promo_products_offer_id ON public.offer_promo_products(offer_id);
