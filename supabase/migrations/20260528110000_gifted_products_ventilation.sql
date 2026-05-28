-- Produits offerts : ventilation du prix d'achat sur les lignes éligibles
-- - categories.absorbs_gifted_cost : marque les catégories qui absorbent le coût des offerts (PC/laptop/tablette)
-- - offer_equipment / contract_equipment : is_gifted, category_id, base_purchase_price

-- 1. Catégories absorbantes (réglage entreprise)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS absorbs_gifted_cost BOOLEAN NOT NULL DEFAULT false;

-- Défauts sensés : les catégories standard PC / laptop / tablette absorbent par défaut
UPDATE public.categories
  SET absorbs_gifted_cost = true
  WHERE name IN ('laptop', 'desktop', 'tablet');

-- Propager la nouvelle colonne dans la vue de comptage
DROP VIEW IF EXISTS public.categories_with_product_count;
CREATE VIEW public.categories_with_product_count
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.name,
  c.translation,
  c.description,
  c.company_id,
  c.created_at,
  c.updated_at,
  c.absorbs_gifted_cost,
  count(p.id) AS product_count
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.id, c.name, c.translation, c.description, c.company_id, c.created_at, c.updated_at, c.absorbs_gifted_cost;

-- 2. Colonnes sur offer_equipment
ALTER TABLE public.offer_equipment
  ADD COLUMN IF NOT EXISTS is_gifted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_purchase_price NUMERIC;

CREATE INDEX IF NOT EXISTS idx_offer_equipment_category_id ON public.offer_equipment(category_id);

-- 3. Colonnes sur contract_equipment (conservation lors de la conversion offre -> contrat)
ALTER TABLE public.contract_equipment
  ADD COLUMN IF NOT EXISTS is_gifted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_purchase_price NUMERIC;

CREATE INDEX IF NOT EXISTS idx_contract_equipment_category_id ON public.contract_equipment(category_id);

-- 4. RPC insert_offer_equipment_secure : ajout is_gifted / category_id / base_purchase_price
DROP FUNCTION IF EXISTS public.insert_offer_equipment_secure(
  uuid, text, numeric, integer, numeric, numeric, numeric, numeric,
  text, uuid, uuid, text, text, text, text, text, text, text, text, uuid, text
);

CREATE OR REPLACE FUNCTION public.insert_offer_equipment_secure(
  p_offer_id UUID,
  p_title TEXT,
  p_purchase_price NUMERIC,
  p_quantity INTEGER,
  p_margin NUMERIC,
  p_monthly_payment NUMERIC DEFAULT NULL,
  p_selling_price NUMERIC DEFAULT NULL,
  p_coefficient NUMERIC DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_collaborator_id UUID DEFAULT NULL,
  p_delivery_site_id UUID DEFAULT NULL,
  p_delivery_type TEXT DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_city TEXT DEFAULT NULL,
  p_delivery_postal_code TEXT DEFAULT NULL,
  p_delivery_country TEXT DEFAULT NULL,
  p_delivery_contact_name TEXT DEFAULT NULL,
  p_delivery_contact_email TEXT DEFAULT NULL,
  p_delivery_contact_phone TEXT DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_is_gifted BOOLEAN DEFAULT false,
  p_category_id UUID DEFAULT NULL,
  p_base_purchase_price NUMERIC DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipment_id UUID;
  v_user_company_id UUID;
BEGIN
  SELECT company_id INTO v_user_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User company not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.offers
    WHERE id = p_offer_id AND company_id = v_user_company_id
  ) THEN
    RAISE EXCEPTION 'Offer not found or access denied';
  END IF;

  INSERT INTO public.offer_equipment (
    offer_id, title, purchase_price, quantity, margin,
    monthly_payment, selling_price, coefficient, serial_number,
    collaborator_id, delivery_site_id, delivery_type,
    delivery_address, delivery_city, delivery_postal_code, delivery_country,
    delivery_contact_name, delivery_contact_email, delivery_contact_phone,
    product_id, image_url,
    is_gifted, category_id, base_purchase_price
  ) VALUES (
    p_offer_id, p_title, p_purchase_price, p_quantity, p_margin,
    p_monthly_payment, p_selling_price, p_coefficient, p_serial_number,
    p_collaborator_id, p_delivery_site_id, p_delivery_type,
    p_delivery_address, p_delivery_city, p_delivery_postal_code, p_delivery_country,
    p_delivery_contact_name, p_delivery_contact_email, p_delivery_contact_phone,
    p_product_id, p_image_url,
    p_is_gifted, p_category_id, COALESCE(p_base_purchase_price, p_purchase_price)
  )
  RETURNING id INTO v_equipment_id;

  RETURN v_equipment_id;
END;
$$;

-- 5. RPC update_offer_equipment_secure : ajout is_gifted / category_id / base_purchase_price
DROP FUNCTION IF EXISTS public.update_offer_equipment_secure(
  uuid, text, numeric, integer, numeric, numeric, numeric, numeric,
  text, uuid, uuid, text, text, text, text, text, text, text, text, uuid, text
);

CREATE OR REPLACE FUNCTION public.update_offer_equipment_secure(
  p_equipment_id UUID,
  p_title TEXT DEFAULT NULL,
  p_purchase_price NUMERIC DEFAULT NULL,
  p_quantity INTEGER DEFAULT NULL,
  p_margin NUMERIC DEFAULT NULL,
  p_monthly_payment NUMERIC DEFAULT NULL,
  p_selling_price NUMERIC DEFAULT NULL,
  p_coefficient NUMERIC DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL,
  p_collaborator_id UUID DEFAULT NULL,
  p_delivery_site_id UUID DEFAULT NULL,
  p_delivery_type TEXT DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_city TEXT DEFAULT NULL,
  p_delivery_postal_code TEXT DEFAULT NULL,
  p_delivery_country TEXT DEFAULT NULL,
  p_delivery_contact_name TEXT DEFAULT NULL,
  p_delivery_contact_email TEXT DEFAULT NULL,
  p_delivery_contact_phone TEXT DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_is_gifted BOOLEAN DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_base_purchase_price NUMERIC DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_company_id UUID;
  v_offer_id UUID;
BEGIN
  SELECT company_id INTO v_user_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User company not found';
  END IF;

  SELECT oe.offer_id INTO v_offer_id
  FROM public.offer_equipment oe
  JOIN public.offers o ON o.id = oe.offer_id
  WHERE oe.id = p_equipment_id AND o.company_id = v_user_company_id;

  IF v_offer_id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found or access denied';
  END IF;

  UPDATE public.offer_equipment
  SET
    title = COALESCE(p_title, title),
    purchase_price = COALESCE(p_purchase_price, purchase_price),
    quantity = COALESCE(p_quantity, quantity),
    margin = COALESCE(p_margin, margin),
    monthly_payment = COALESCE(p_monthly_payment, monthly_payment),
    selling_price = COALESCE(p_selling_price, selling_price),
    coefficient = COALESCE(p_coefficient, coefficient),
    serial_number = COALESCE(p_serial_number, serial_number),
    collaborator_id = COALESCE(p_collaborator_id, collaborator_id),
    delivery_site_id = COALESCE(p_delivery_site_id, delivery_site_id),
    delivery_type = COALESCE(p_delivery_type, delivery_type),
    delivery_address = COALESCE(p_delivery_address, delivery_address),
    delivery_city = COALESCE(p_delivery_city, delivery_city),
    delivery_postal_code = COALESCE(p_delivery_postal_code, delivery_postal_code),
    delivery_country = COALESCE(p_delivery_country, delivery_country),
    delivery_contact_name = COALESCE(p_delivery_contact_name, delivery_contact_name),
    delivery_contact_email = COALESCE(p_delivery_contact_email, delivery_contact_email),
    delivery_contact_phone = COALESCE(p_delivery_contact_phone, delivery_contact_phone),
    product_id = COALESCE(p_product_id, product_id),
    image_url = COALESCE(p_image_url, image_url),
    is_gifted = COALESCE(p_is_gifted, is_gifted),
    category_id = COALESCE(p_category_id, category_id),
    base_purchase_price = COALESCE(p_base_purchase_price, base_purchase_price),
    updated_at = now()
  WHERE id = p_equipment_id;
END;
$$;
