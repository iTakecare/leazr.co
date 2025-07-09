-- =============================================
-- ÉTAPE 1: Isolation des Commission Levels
-- =============================================

-- Ajouter la colonne company_id à commission_levels
ALTER TABLE public.commission_levels 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Migrer les données existantes vers iTakecare
UPDATE public.commission_levels 
SET company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
WHERE company_id IS NULL;

-- Rendre la colonne obligatoire
ALTER TABLE public.commission_levels 
ALTER COLUMN company_id SET NOT NULL;

-- Supprimer TOUTES les politiques existantes pour commission_levels
DROP POLICY IF EXISTS "Admin manage commission_levels" ON public.commission_levels;
DROP POLICY IF EXISTS "Public read commission_levels" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_read" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_read_all" ON public.commission_levels;
DROP POLICY IF EXISTS "Commission levels access" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_admin" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_admin_write" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_strict_company_isolation" ON public.commission_levels;

-- Créer la politique d'isolation stricte pour commission_levels
CREATE POLICY "commission_levels_strict_company_isolation" ON public.commission_levels
FOR ALL USING (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- =============================================
-- ÉTAPE 2: Isolation des Commission Rates  
-- =============================================

-- Ajouter la colonne company_id à commission_rates
ALTER TABLE public.commission_rates 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Migrer les données existantes vers iTakecare
UPDATE public.commission_rates 
SET company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
WHERE company_id IS NULL;

-- Rendre la colonne obligatoire
ALTER TABLE public.commission_rates 
ALTER COLUMN company_id SET NOT NULL;

-- Supprimer TOUTES les politiques existantes pour commission_rates
DROP POLICY IF EXISTS "Admin manage commission_rates" ON public.commission_rates;
DROP POLICY IF EXISTS "Public read commission_rates" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_read" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_read_all" ON public.commission_rates;
DROP POLICY IF EXISTS "Commission rates unified" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_admin" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_admin_write" ON public.commission_rates;

-- Créer la politique d'isolation stricte pour commission_rates
CREATE POLICY "commission_rates_strict_company_isolation" ON public.commission_rates
FOR ALL USING (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- =============================================
-- ÉTAPE 3: Isolation des Email Templates
-- =============================================

-- Ajouter la colonne company_id à email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Migrer les données existantes vers iTakecare
UPDATE public.email_templates 
SET company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
WHERE company_id IS NULL;

-- Rendre la colonne obligatoire
ALTER TABLE public.email_templates 
ALTER COLUMN company_id SET NOT NULL;

-- Supprimer TOUTES les politiques existantes pour email_templates
DROP POLICY IF EXISTS "Admin manage email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Email templates unified" ON public.email_templates;
DROP POLICY IF EXISTS "Public read email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_admin" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_admin_write" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_public_read" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_read" ON public.email_templates;
DROP POLICY IF EXISTS "manage_email_templates_policy" ON public.email_templates;
DROP POLICY IF EXISTS "read_email_templates_policy" ON public.email_templates;

-- Créer la politique d'isolation stricte pour email_templates
CREATE POLICY "email_templates_strict_company_isolation" ON public.email_templates
FOR ALL USING (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- =============================================
-- ÉTAPE 4: Nettoyer les doublons de commission_levels
-- =============================================

-- Supprimer les doublons en gardant le plus récent pour chaque combinaison (name, type, company_id)
DELETE FROM public.commission_levels 
WHERE id NOT IN (
  SELECT DISTINCT ON (name, type, company_id) id
  FROM public.commission_levels 
  ORDER BY name, type, company_id, created_at DESC
);

-- =============================================
-- ÉTAPE 5: Modifier initialize_new_company pour ne plus créer de données par défaut
-- =============================================

CREATE OR REPLACE FUNCTION public.initialize_new_company(p_company_id uuid, p_company_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer des paramètres par défaut pour l'entreprise
  INSERT INTO public.company_customizations (
    company_id,
    company_name,
    primary_color,
    secondary_color,
    accent_color,
    created_at
  ) VALUES (
    p_company_id,
    p_company_name,
    '#3b82f6',
    '#64748b', 
    '#8b5cf6',
    now()
  ) ON CONFLICT (company_id) DO NOTHING;

  -- NE PLUS créer de commission levels par défaut - chaque entreprise démarre vierge

  -- Créer des marques par défaut pour la nouvelle entreprise
  INSERT INTO public.brands (name, translation, company_id) VALUES
  ('Dell', 'Dell', p_company_id),
  ('HP', 'HP', p_company_id),
  ('Lenovo', 'Lenovo', p_company_id),
  ('Apple', 'Apple', p_company_id)
  ON CONFLICT DO NOTHING;

  -- Créer des catégories par défaut pour la nouvelle entreprise
  INSERT INTO public.categories (name, translation, company_id) VALUES
  ('Ordinateurs portables', 'Laptops', p_company_id),
  ('Ordinateurs de bureau', 'Desktop computers', p_company_id),
  ('Écrans', 'Monitors', p_company_id),
  ('Accessoires', 'Accessories', p_company_id)
  ON CONFLICT DO NOTHING;

  -- Créer des produits par défaut pour la nouvelle entreprise en dupliquant ceux d'iTakecare
  INSERT INTO public.products (
    company_id, name, brand, category, description, price, monthly_price,
    image_url, specifications, tier, active, model, stock, admin_only,
    slug, permalink, type, status, featured, catalog_visibility,
    short_description, sku, regular_price, sale_price, price_html,
    on_sale, purchasable, total_sales, virtual, downloadable,
    external_url, button_text, tax_status, tax_class, manage_stock,
    stock_quantity, in_stock, backorders, backorders_allowed,
    backordered, sold_individually, weight, shipping_required,
    shipping_taxable, shipping_class, shipping_class_id,
    reviews_allowed, average_rating, rating_count, parent_id,
    purchase_note, menu_order, price_number, is_parent,
    is_variation, parent_id_ref, variants_count, has_variants,
    has_child_variants, image_urls, image_alts, attributes
  )
  SELECT 
    p_company_id as company_id,
    name, brand, category, description, price, monthly_price,
    image_url, specifications, tier, active, model, stock, admin_only,
    slug, permalink, type, status, featured, catalog_visibility,
    short_description, sku, regular_price, sale_price, price_html,
    on_sale, purchasable, total_sales, virtual, downloadable,
    external_url, button_text, tax_status, tax_class, manage_stock,
    stock_quantity, in_stock, backorders, backorders_allowed,
    backordered, sold_individually, weight, shipping_required,
    shipping_taxable, shipping_class, shipping_class_id,
    reviews_allowed, average_rating, rating_count, parent_id,
    purchase_note, menu_order, price_number, is_parent,
    is_variation, parent_id_ref, variants_count, has_variants,
    has_child_variants, image_urls, image_alts, attributes
  FROM public.products 
  WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0' -- iTakecare comme modèle
  AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE company_id = p_company_id
  );

  RETURN true;
END;
$$;