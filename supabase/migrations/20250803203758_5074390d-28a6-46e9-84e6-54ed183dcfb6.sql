-- Phase 1: Catalogue Personnalisé Client - Tables de Base de Données

-- 1. Ajouter le flag has_custom_catalog dans la table clients
ALTER TABLE public.clients 
ADD COLUMN has_custom_catalog boolean DEFAULT false;

-- 2. Créer la table client_custom_prices pour les prix personnalisés des produits
CREATE TABLE public.client_custom_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Prix personnalisés pour le produit principal
  custom_monthly_price numeric,
  custom_purchase_price numeric,
  margin_rate numeric, -- Taux de marge spécifique (ex: 0.15 pour 15%)
  
  -- Métadonnées
  is_active boolean DEFAULT true,
  valid_from timestamptz DEFAULT now(),
  valid_to timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_client_product UNIQUE(client_id, product_id)
);

-- Index pour performance
CREATE INDEX idx_client_custom_prices_client_company ON public.client_custom_prices(client_id, company_id);
CREATE INDEX idx_client_custom_prices_product_company ON public.client_custom_prices(product_id, company_id);

-- 3. Créer la table client_custom_variant_prices pour les prix personnalisés des variants
CREATE TABLE public.client_custom_variant_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  variant_price_id uuid NOT NULL REFERENCES public.product_variant_prices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Prix personnalisés pour cette combinaison de variant
  custom_monthly_price numeric,
  custom_purchase_price numeric,
  margin_rate numeric,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_client_variant UNIQUE(client_id, variant_price_id)
);

-- Index pour performance
CREATE INDEX idx_client_custom_variant_prices_client_company ON public.client_custom_variant_prices(client_id, company_id);

-- 4. Trigger pour updated_at sur client_custom_prices
CREATE OR REPLACE FUNCTION public.update_client_custom_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_custom_prices_updated_at
  BEFORE UPDATE ON public.client_custom_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_custom_prices_updated_at();

-- 5. Trigger pour updated_at sur client_custom_variant_prices
CREATE OR REPLACE FUNCTION public.update_client_custom_variant_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_custom_variant_prices_updated_at
  BEFORE UPDATE ON public.client_custom_variant_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_custom_variant_prices_updated_at();

-- 6. Enable RLS sur les nouvelles tables
ALTER TABLE public.client_custom_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_custom_variant_prices ENABLE ROW LEVEL SECURITY;

-- 7. Politiques RLS pour client_custom_prices
CREATE POLICY "client_custom_prices_company_isolation" 
ON public.client_custom_prices 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Les clients peuvent voir leurs propres prix personnalisés
CREATE POLICY "client_custom_prices_client_access" 
ON public.client_custom_prices 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  )
);

-- 8. Politiques RLS pour client_custom_variant_prices
CREATE POLICY "client_custom_variant_prices_company_isolation" 
ON public.client_custom_variant_prices 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Les clients peuvent voir leurs propres prix personnalisés de variants
CREATE POLICY "client_custom_variant_prices_client_access" 
ON public.client_custom_variant_prices 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  )
);