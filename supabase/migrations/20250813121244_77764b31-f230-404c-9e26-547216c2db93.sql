-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION validate_delivery_quantities()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_equipment_quantity INTEGER;
  total_delivery_quantity INTEGER;
BEGIN
  -- Get the total quantity from the parent equipment
  SELECT quantity INTO total_equipment_quantity
  FROM contract_equipment
  WHERE id = COALESCE(NEW.contract_equipment_id, OLD.contract_equipment_id);
  
  -- Get the sum of all delivery quantities for this equipment
  SELECT COALESCE(SUM(quantity), 0) INTO total_delivery_quantity
  FROM contract_equipment_deliveries
  WHERE contract_equipment_id = COALESCE(NEW.contract_equipment_id, OLD.contract_equipment_id)
    AND id != COALESCE(NEW.id, OLD.id);
  
  -- Add the current row quantity if it's an INSERT or UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    total_delivery_quantity := total_delivery_quantity + NEW.quantity;
  END IF;
  
  -- Check that we don't exceed the total equipment quantity
  IF total_delivery_quantity > total_equipment_quantity THEN
    RAISE EXCEPTION 'Total delivery quantities (%) cannot exceed equipment quantity (%)', 
      total_delivery_quantity, total_equipment_quantity;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;