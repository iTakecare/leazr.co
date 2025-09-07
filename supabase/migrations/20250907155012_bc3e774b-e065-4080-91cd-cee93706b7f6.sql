-- Fix security issues by setting search_path properly for the new functions
DROP FUNCTION IF EXISTS public.fix_offer_data_inconsistencies;
DROP FUNCTION IF EXISTS public.update_equipment_with_global_margin;

-- Create function to fix offer data inconsistencies with proper security
CREATE OR REPLACE FUNCTION public.fix_offer_data_inconsistencies(p_offer_id uuid, p_leaser_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  equipment_record RECORD;
BEGIN
  -- Update offer leaser_id
  UPDATE public.offers 
  SET leaser_id = p_leaser_id, updated_at = now()
  WHERE id = p_offer_id AND company_id = get_user_company_id();
  
  -- Update equipment selling_price and coefficient
  FOR equipment_record IN 
    SELECT id, purchase_price, margin, monthly_payment
    FROM public.offer_equipment 
    WHERE offer_id = p_offer_id
  LOOP
    UPDATE public.offer_equipment 
    SET 
      selling_price = equipment_record.purchase_price * (1 + COALESCE(equipment_record.margin, 0) / 100),
      coefficient = CASE 
        WHEN equipment_record.purchase_price > 0 
        THEN (COALESCE(equipment_record.monthly_payment, 0) * 36) / equipment_record.purchase_price 
        ELSE 0 
      END,
      updated_at = now()
    WHERE id = equipment_record.id;
  END LOOP;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create function to update offer equipment with recalculated values based on global margin
CREATE OR REPLACE FUNCTION public.update_equipment_with_global_margin(
  p_offer_id uuid, 
  p_margin_percentage numeric,
  p_leaser_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_purchase_price numeric := 0;
  new_total_selling_price numeric := 0;
  new_total_monthly_payment numeric := 0;
  equipment_record RECORD;
  leaser_data RECORD;
  coefficient numeric := 2.0; -- Default fallback coefficient
BEGIN
  -- Get leaser coefficient for the financed amount
  SELECT * INTO leaser_data FROM public.leasers WHERE id = p_leaser_id;
  
  -- Calculate total purchase price
  SELECT COALESCE(SUM(purchase_price * quantity), 0) INTO total_purchase_price
  FROM public.offer_equipment 
  WHERE offer_id = p_offer_id;
  
  IF total_purchase_price = 0 THEN
    RETURN QUERY SELECT false, 'No equipment found or zero purchase price'::text;
    RETURN;
  END IF;
  
  -- Calculate new total selling price based on margin percentage
  new_total_selling_price := total_purchase_price * (1 + p_margin_percentage / 100);
  
  -- Get appropriate coefficient from leaser for the new selling price
  IF leaser_data.id IS NOT NULL THEN
    -- Use leaser's coefficient calculation logic here
    -- For now, using a simple coefficient based on amount ranges
    coefficient := CASE 
      WHEN new_total_selling_price <= 5000 THEN 2.0
      WHEN new_total_selling_price <= 10000 THEN 2.1
      ELSE 2.2
    END;
  END IF;
  
  -- Calculate new total monthly payment
  new_total_monthly_payment := new_total_selling_price / 36 * coefficient;
  
  -- Update each equipment proportionally
  FOR equipment_record IN 
    SELECT id, purchase_price, quantity
    FROM public.offer_equipment 
    WHERE offer_id = p_offer_id
  LOOP
    DECLARE
      equipment_total numeric := equipment_record.purchase_price * equipment_record.quantity;
      proportion numeric := equipment_total / total_purchase_price;
      new_selling_price numeric := equipment_total * (1 + p_margin_percentage / 100);
      new_monthly_payment numeric := new_total_monthly_payment * proportion;
      new_coefficient numeric := CASE 
        WHEN equipment_record.purchase_price > 0 
        THEN (new_monthly_payment * 36) / equipment_total
        ELSE 0 
      END;
    BEGIN
      UPDATE public.offer_equipment 
      SET 
        margin = p_margin_percentage,
        selling_price = new_selling_price,
        monthly_payment = new_monthly_payment,
        coefficient = new_coefficient,
        updated_at = now()
      WHERE id = equipment_record.id;
    END;
  END LOOP;
  
  -- Update offer financed_amount
  UPDATE public.offers 
  SET 
    financed_amount = new_total_selling_price,
    updated_at = now()
  WHERE id = p_offer_id AND company_id = get_user_company_id();
  
  RETURN QUERY SELECT true, 'Equipment updated successfully with global margin'::text;
END;
$$;