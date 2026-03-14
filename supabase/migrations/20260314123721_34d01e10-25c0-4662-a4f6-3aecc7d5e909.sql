
-- 1. Add partner columns to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS partner_slug text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS partner_name text;

-- 2. Create offer_external_services table
CREATE TABLE IF NOT EXISTS public.offer_external_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  product_name text NOT NULL,
  description text,
  price_htva numeric NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly',
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.offer_external_services ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies: authenticated users can read/write for their company's offers
CREATE POLICY "Users can view external services for their company offers"
  ON public.offer_external_services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.profiles p ON p.company_id = o.company_id
      WHERE o.id = offer_external_services.offer_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert external services for their company offers"
  ON public.offer_external_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.profiles p ON p.company_id = o.company_id
      WHERE o.id = offer_external_services.offer_id
        AND p.id = auth.uid()
    )
  );

-- 5. Service role bypass for edge functions (inserting via service key)
CREATE POLICY "Service role full access on offer_external_services"
  ON public.offer_external_services
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS idx_offer_external_services_offer_id ON public.offer_external_services(offer_id);
CREATE INDEX IF NOT EXISTS idx_offers_partner_slug ON public.offers(partner_slug) WHERE partner_slug IS NOT NULL;
