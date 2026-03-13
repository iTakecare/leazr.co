
-- ============================================
-- PARTNERS
-- ============================================
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slug)
);

CREATE INDEX idx_partners_company ON public.partners(company_id);
CREATE INDEX idx_partners_slug ON public.partners(slug);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active partners"
ON public.partners FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage partners"
ON public.partners FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = partners.company_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = partners.company_id)
);

-- ============================================
-- PARTNER PACKS
-- ============================================
CREATE TABLE public.partner_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.product_packs(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  is_customizable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, pack_id)
);

CREATE INDEX idx_partner_packs_partner ON public.partner_packs(partner_id);

ALTER TABLE public.partner_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view partner packs"
ON public.partner_packs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_packs.partner_id AND p.is_active = true)
);

CREATE POLICY "Authenticated users can manage partner packs"
ON public.partner_packs FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.partners pt
    JOIN public.profiles pr ON pr.company_id = pt.company_id
    WHERE pt.id = partner_packs.partner_id AND pr.id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners pt
    JOIN public.profiles pr ON pr.company_id = pt.company_id
    WHERE pt.id = partner_packs.partner_id AND pr.id = auth.uid()
  )
);

-- ============================================
-- PARTNER PACK OPTIONS
-- ============================================
CREATE TABLE public.partner_pack_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_pack_id UUID NOT NULL REFERENCES public.partner_packs(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  max_quantity INT NOT NULL DEFAULT 1,
  position INT NOT NULL DEFAULT 0,
  allowed_product_ids UUID[] DEFAULT '{}'
);

CREATE INDEX idx_partner_pack_options_pack ON public.partner_pack_options(partner_pack_id);

ALTER TABLE public.partner_pack_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view partner pack options"
ON public.partner_pack_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.partner_packs pp
    JOIN public.partners p ON p.id = pp.partner_id
    WHERE pp.id = partner_pack_options.partner_pack_id AND p.is_active = true
  )
);

CREATE POLICY "Authenticated users can manage partner pack options"
ON public.partner_pack_options FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.partner_packs pp
    JOIN public.partners pt ON pt.id = pp.partner_id
    JOIN public.profiles pr ON pr.company_id = pt.company_id
    WHERE pp.id = partner_pack_options.partner_pack_id AND pr.id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partner_packs pp
    JOIN public.partners pt ON pt.id = pp.partner_id
    JOIN public.profiles pr ON pr.company_id = pt.company_id
    WHERE pp.id = partner_pack_options.partner_pack_id AND pr.id = auth.uid()
  )
);

-- ============================================
-- EXTERNAL PROVIDERS
-- ============================================
CREATE TABLE public.external_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_external_providers_company ON public.external_providers(company_id);

ALTER TABLE public.external_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active providers"
ON public.external_providers FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage providers"
ON public.external_providers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = external_providers.company_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = external_providers.company_id)
);

-- ============================================
-- EXTERNAL PROVIDER PRODUCTS
-- ============================================
CREATE TABLE public.external_provider_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.external_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_htva NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_external_provider_products_provider ON public.external_provider_products(provider_id);

ALTER TABLE public.external_provider_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active provider products"
ON public.external_provider_products FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.external_providers ep WHERE ep.id = external_provider_products.provider_id AND ep.is_active = true)
  AND is_active = true
);

CREATE POLICY "Authenticated users can manage provider products"
ON public.external_provider_products FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.external_providers ep
    JOIN public.profiles pr ON pr.company_id = ep.company_id
    WHERE ep.id = external_provider_products.provider_id AND pr.id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.external_providers ep
    JOIN public.profiles pr ON pr.company_id = ep.company_id
    WHERE ep.id = external_provider_products.provider_id AND pr.id = auth.uid()
  )
);

-- ============================================
-- PARTNER PROVIDER LINKS
-- ============================================
CREATE TABLE public.partner_provider_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.external_providers(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  card_title TEXT,
  selected_product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, provider_id)
);

CREATE INDEX idx_partner_provider_links_partner ON public.partner_provider_links(partner_id);

ALTER TABLE public.partner_provider_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view partner provider links"
ON public.partner_provider_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_provider_links.partner_id AND p.is_active = true)
);

CREATE POLICY "Authenticated users can manage partner provider links"
ON public.partner_provider_links FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.partners pt
    JOIN public.profiles pr ON pr.company_id = pt.company_id
    WHERE pt.id = partner_provider_links.partner_id AND pr.id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners pt
    JOIN public.profiles pr ON pr.company_id = pt.company_id
    WHERE pt.id = partner_provider_links.partner_id AND pr.id = auth.uid()
  )
);
