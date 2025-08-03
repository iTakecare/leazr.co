-- Create secure functions for offer equipment insertion

-- Function to insert offer equipment securely
CREATE OR REPLACE FUNCTION public.insert_offer_equipment_secure(
  p_offer_id uuid,
  p_title text,
  p_purchase_price numeric,
  p_quantity integer,
  p_margin numeric,
  p_monthly_payment numeric DEFAULT NULL,
  p_serial_number text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  equipment_id uuid;
BEGIN
  INSERT INTO public.offer_equipment (
    offer_id,
    title,
    purchase_price,
    quantity,
    margin,
    monthly_payment,
    serial_number
  ) VALUES (
    p_offer_id,
    p_title,
    p_purchase_price,
    p_quantity,
    p_margin,
    p_monthly_payment,
    p_serial_number
  ) RETURNING id INTO equipment_id;
  
  RETURN equipment_id;
END;
$function$;

-- Function to insert offer equipment attributes securely
CREATE OR REPLACE FUNCTION public.insert_offer_equipment_attributes_secure(
  p_equipment_id uuid,
  p_attributes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attr_key text;
  attr_value text;
BEGIN
  FOR attr_key, attr_value IN SELECT * FROM jsonb_each_text(p_attributes)
  LOOP
    INSERT INTO public.offer_equipment_attributes (
      equipment_id,
      key,
      value
    ) VALUES (
      p_equipment_id,
      attr_key,
      attr_value
    );
  END LOOP;
END;
$function$;

-- Function to insert offer equipment specifications securely
CREATE OR REPLACE FUNCTION public.insert_offer_equipment_specifications_secure(
  p_equipment_id uuid,
  p_specifications jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  spec_key text;
  spec_value text;
BEGIN
  FOR spec_key, spec_value IN SELECT * FROM jsonb_each_text(p_specifications)
  LOOP
    INSERT INTO public.offer_equipment_specifications (
      equipment_id,
      key,
      value
    ) VALUES (
      p_equipment_id,
      spec_key,
      spec_value
    );
  END LOOP;
END;
$function$;