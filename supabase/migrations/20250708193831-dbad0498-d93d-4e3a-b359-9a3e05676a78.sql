
-- Corriger l'isolation du catalogue

-- 1. Créer des produits pour ALizz SRL en dupliquant ceux d'iTakecare
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
  'b501f123-2c3f-4855-81d1-ceb32afb9ff0'::uuid as company_id, -- ALizz SRL company_id
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
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'; -- iTakecare company_id

-- 2. Améliorer la fonction initialize_new_company pour créer des produits par défaut
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
