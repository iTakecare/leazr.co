-- Create secure RPC functions for inserting offer equipment and related data

-- Function to securely insert offer equipment
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
  p_delivery_contact_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  offer_company_id UUID;
  new_equipment_id UUID;
BEGIN
  -- Get user's company ID
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: User company not found';
  END IF;
  
  -- Verify the offer belongs to the user's company
  SELECT company_id INTO offer_company_id
  FROM public.offers
  WHERE id = p_offer_id;
  
  IF offer_company_id IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;
  
  IF offer_company_id != user_company_id AND NOT is_admin_optimized() THEN
    RAISE EXCEPTION 'Access denied: Offer belongs to different company';
  END IF;
  
  -- Insert the equipment
  INSERT INTO public.offer_equipment (
    offer_id,
    title,
    purchase_price,
    quantity,
    margin,
    monthly_payment,
    selling_price,
    coefficient,
    serial_number,
    collaborator_id,
    delivery_site_id,
    delivery_type,
    delivery_address,
    delivery_city,
    delivery_postal_code,
    delivery_country,
    delivery_contact_name,
    delivery_contact_email,
    delivery_contact_phone,
    created_at,
    updated_at
  ) VALUES (
    p_offer_id,
    p_title,
    p_purchase_price,
    p_quantity,
    p_margin,
    p_monthly_payment,
    p_selling_price,
    p_coefficient,
    p_serial_number,
    p_collaborator_id,
    p_delivery_site_id,
    p_delivery_type,
    p_delivery_address,
    p_delivery_city,
    p_delivery_postal_code,
    p_delivery_country,
    p_delivery_contact_name,
    p_delivery_contact_email,
    p_delivery_contact_phone,
    now(),
    now()
  ) RETURNING id INTO new_equipment_id;
  
  RETURN new_equipment_id;
END;
$$;

-- Function to securely insert offer equipment attributes
CREATE OR REPLACE FUNCTION public.insert_offer_equipment_attributes_secure(
  p_equipment_id UUID,
  p_key TEXT,
  p_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  equipment_company_id UUID;
  new_attribute_id UUID;
BEGIN
  -- Get user's company ID
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: User company not found';
  END IF;
  
  -- Verify the equipment belongs to the user's company
  SELECT o.company_id INTO equipment_company_id
  FROM public.offer_equipment oe
  JOIN public.offers o ON oe.offer_id = o.id
  WHERE oe.id = p_equipment_id;
  
  IF equipment_company_id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found';
  END IF;
  
  IF equipment_company_id != user_company_id AND NOT is_admin_optimized() THEN
    RAISE EXCEPTION 'Access denied: Equipment belongs to different company';
  END IF;
  
  -- Insert the attribute
  INSERT INTO public.offer_equipment_attributes (
    equipment_id,
    key,
    value,
    created_at
  ) VALUES (
    p_equipment_id,
    p_key,
    p_value,
    now()
  ) RETURNING id INTO new_attribute_id;
  
  RETURN new_attribute_id;
END;
$$;

-- Function to securely insert offer equipment specifications
CREATE OR REPLACE FUNCTION public.insert_offer_equipment_specifications_secure(
  p_equipment_id UUID,
  p_key TEXT,
  p_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  equipment_company_id UUID;
  new_specification_id UUID;
BEGIN
  -- Get user's company ID
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: User company not found';
  END IF;
  
  -- Verify the equipment belongs to the user's company
  SELECT o.company_id INTO equipment_company_id
  FROM public.offer_equipment oe
  JOIN public.offers o ON oe.offer_id = o.id
  WHERE oe.id = p_equipment_id;
  
  IF equipment_company_id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found';
  END IF;
  
  IF equipment_company_id != user_company_id AND NOT is_admin_optimized() THEN
    RAISE EXCEPTION 'Access denied: Equipment belongs to different company';
  END IF;
  
  -- Insert the specification
  INSERT INTO public.offer_equipment_specifications (
    equipment_id,
    key,
    value,
    created_at
  ) VALUES (
    p_equipment_id,
    p_key,
    p_value,
    now()
  ) RETURNING id INTO new_specification_id;
  
  RETURN new_specification_id;
END;
$$;