-- Create table for individual equipment deliveries
CREATE TABLE public.contract_equipment_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_equipment_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  serial_numbers TEXT[] DEFAULT '{}',
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('main_client', 'collaborator', 'predefined_site', 'specific_address')),
  collaborator_id UUID,
  delivery_site_id UUID,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postal_code TEXT,
  delivery_country TEXT DEFAULT 'BE',
  delivery_contact_name TEXT,
  delivery_contact_email TEXT,
  delivery_contact_phone TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'prepared', 'shipped', 'delivered', 'cancelled')),
  delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_equipment_deliveries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "contract_equipment_deliveries_company_access"
ON public.contract_equipment_deliveries
FOR ALL
USING (
  contract_equipment_id IN (
    SELECT ce.id 
    FROM contract_equipment ce
    JOIN contracts c ON ce.contract_id = c.id
    WHERE c.company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Add trigger for updated_at
CREATE TRIGGER update_contract_equipment_deliveries_updated_at
  BEFORE UPDATE ON public.contract_equipment_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate total quantities match
CREATE OR REPLACE FUNCTION validate_delivery_quantities()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to validate quantities
CREATE TRIGGER validate_delivery_quantities_trigger
  BEFORE INSERT OR UPDATE ON public.contract_equipment_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_quantities();