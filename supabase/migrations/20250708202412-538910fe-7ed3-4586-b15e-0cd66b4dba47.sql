
-- 1. Ajouter la colonne company_id aux tables brands et categories
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 2. Migrer toutes les données existantes vers iTakecare
UPDATE public.brands 
SET company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0' 
WHERE company_id IS NULL;

UPDATE public.categories 
SET company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0' 
WHERE company_id IS NULL;

-- 3. Rendre la colonne company_id obligatoire
ALTER TABLE public.brands 
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.categories 
ALTER COLUMN company_id SET NOT NULL;

-- 4. Mettre à jour les politiques RLS pour les brands
DROP POLICY IF EXISTS "Brands access policy" ON public.brands;
DROP POLICY IF EXISTS "Brands unified" ON public.brands;
DROP POLICY IF EXISTS "brands_admin_write" ON public.brands;
DROP POLICY IF EXISTS "brands_read" ON public.brands;
DROP POLICY IF EXISTS "brands_read_all" ON public.brands;

CREATE POLICY "brands_company_isolation" ON public.brands
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- 5. Mettre à jour les politiques RLS pour les categories
DROP POLICY IF EXISTS "Categories access policy" ON public.categories;
DROP POLICY IF EXISTS "Categories unified" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
DROP POLICY IF EXISTS "categories_read" ON public.categories;
DROP POLICY IF EXISTS "categories_read_all" ON public.categories;

CREATE POLICY "categories_company_isolation" ON public.categories
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- 6. Créer des marques et catégories par défaut pour ALizz SRL
INSERT INTO public.brands (name, translation, company_id) VALUES
('Dell', 'Dell', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0'),
('HP', 'HP', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0'),
('Lenovo', 'Lenovo', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0'),
('Apple', 'Apple', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0')
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (name, translation, company_id) VALUES
('Ordinateurs portables', 'Laptops', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0'),
('Ordinateurs de bureau', 'Desktop computers', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0'),
('Écrans', 'Monitors', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0'),
('Accessoires', 'Accessories', 'b501f123-2c3f-4855-81d1-ceb32afb9ff0')
ON CONFLICT DO NOTHING;

-- 7. Mettre à jour la fonction initialize_new_company pour inclure les brands et categories
CREATE OR REPLACE FUNCTION public.initialize_new_company(p_company_id uuid, p_company_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer des leasers par défaut pour la nouvelle entreprise
  INSERT INTO public.leasers (
    company_id,
    name,
    email,
    phone,
    created_at
  ) VALUES 
  (p_company_id, 'Leaser Principal', 'contact@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   '+33 1 00 00 00 00', now()),
  (p_company_id, 'Leaser Secondaire', 'secondaire@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   '+33 1 00 00 00 01', now());

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

  -- Créer des modèles de commission par défaut avec les bons types
  INSERT INTO public.commission_levels (
    name,
    type,
    is_default,
    created_at
  ) VALUES 
  ('Standard Ambassador', 'ambassador', true, now()),
  ('Standard Partner', 'partner', false, now())
  ON CONFLICT DO NOTHING;

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
