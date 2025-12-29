-- =============================================
-- MIGRATION: Création tables fournisseurs et prix fournisseurs
-- Version: 2024.4
-- =============================================

-- 1. Créer la table suppliers (fournisseurs)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,                    -- Code court du fournisseur (ex: "AFB", "INMAC")
  email TEXT,
  phone TEXT,
  website TEXT,
  contact_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Belgium',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);

-- Trigger updated_at pour suppliers
CREATE OR REPLACE FUNCTION public.update_suppliers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_suppliers_updated_at();

-- 2. Créer la table product_supplier_prices (prix par fournisseur)
CREATE TABLE IF NOT EXISTS public.product_supplier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_price_id UUID REFERENCES public.product_variant_prices(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  sku TEXT,                     -- SKU spécifique au fournisseur
  purchase_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  last_price_update TIMESTAMPTZ DEFAULT now(),
  is_preferred BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contrainte unique: un seul prix par produit/variant/fournisseur
  CONSTRAINT unique_product_supplier_variant UNIQUE(product_id, supplier_id, variant_price_id)
);

-- Index pour product_supplier_prices
CREATE INDEX IF NOT EXISTS idx_product_supplier_prices_product ON public.product_supplier_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier_prices_supplier ON public.product_supplier_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier_prices_variant ON public.product_supplier_prices(variant_price_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier_prices_sku ON public.product_supplier_prices(sku);
CREATE INDEX IF NOT EXISTS idx_product_supplier_prices_preferred ON public.product_supplier_prices(is_preferred) WHERE is_preferred = true;

-- Trigger updated_at pour product_supplier_prices
CREATE OR REPLACE FUNCTION public.update_product_supplier_prices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_supplier_prices_updated_at ON public.product_supplier_prices;
CREATE TRIGGER update_product_supplier_prices_updated_at
  BEFORE UPDATE ON public.product_supplier_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_supplier_prices_updated_at();

-- 3. Ajouter purchase_price à product_variant_prices si pas déjà présent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variant_prices' 
    AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE public.product_variant_prices ADD COLUMN purchase_price NUMERIC;
  END IF;
END $$;

-- 4. RLS pour suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les fournisseurs de leur entreprise
CREATE POLICY "suppliers_select_company" ON public.suppliers
  FOR SELECT USING (company_id = public.get_user_company_id());

-- Politique: Les utilisateurs peuvent insérer des fournisseurs pour leur entreprise
CREATE POLICY "suppliers_insert_company" ON public.suppliers
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

-- Politique: Les utilisateurs peuvent modifier les fournisseurs de leur entreprise
CREATE POLICY "suppliers_update_company" ON public.suppliers
  FOR UPDATE USING (company_id = public.get_user_company_id());

-- Politique: Les utilisateurs peuvent supprimer les fournisseurs de leur entreprise
CREATE POLICY "suppliers_delete_company" ON public.suppliers
  FOR DELETE USING (company_id = public.get_user_company_id());

-- 5. RLS pour product_supplier_prices
ALTER TABLE public.product_supplier_prices ENABLE ROW LEVEL SECURITY;

-- Politique basée sur le produit (via products.company_id)
CREATE POLICY "product_supplier_prices_select" ON public.product_supplier_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_id 
      AND p.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "product_supplier_prices_insert" ON public.product_supplier_prices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_id 
      AND p.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "product_supplier_prices_update" ON public.product_supplier_prices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_id 
      AND p.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "product_supplier_prices_delete" ON public.product_supplier_prices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.id = product_id 
      AND p.company_id = public.get_user_company_id()
    )
  );

-- 6. Commentaires pour documentation
COMMENT ON TABLE public.suppliers IS 'Table des fournisseurs par entreprise';
COMMENT ON COLUMN public.suppliers.code IS 'Code court unique du fournisseur (ex: AFB, INMAC)';
COMMENT ON COLUMN public.suppliers.is_active IS 'Indique si le fournisseur est actif';

COMMENT ON TABLE public.product_supplier_prices IS 'Prix d''achat par fournisseur pour chaque produit/variant';
COMMENT ON COLUMN public.product_supplier_prices.sku IS 'SKU spécifique au fournisseur pour identifier le matériel';
COMMENT ON COLUMN public.product_supplier_prices.is_preferred IS 'Indique si ce fournisseur est préféré pour ce produit';
COMMENT ON COLUMN public.product_supplier_prices.last_price_update IS 'Date de dernière mise à jour du prix';