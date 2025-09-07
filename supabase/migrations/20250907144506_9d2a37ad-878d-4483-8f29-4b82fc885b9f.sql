-- Add selling_price and coefficient columns to offer_equipment table
ALTER TABLE public.offer_equipment 
ADD COLUMN selling_price NUMERIC,
ADD COLUMN coefficient NUMERIC;

-- Create RPC function to update offer equipment
CREATE OR REPLACE FUNCTION public.update_offer_equipment_secure(
  p_equipment_id UUID,
  p_title TEXT DEFAULT NULL,
  p_purchase_price NUMERIC DEFAULT NULL,
  p_quantity INTEGER DEFAULT NULL,
  p_margin NUMERIC DEFAULT NULL,
  p_monthly_payment NUMERIC DEFAULT NULL,
  p_selling_price NUMERIC DEFAULT NULL,
  p_coefficient NUMERIC DEFAULT NULL,
  p_serial_number TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  equipment_company_id UUID;
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
  
  -- Update the equipment with provided values
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
    updated_at = now()
  WHERE id = p_equipment_id;
  
  RETURN TRUE;
END;
$$;