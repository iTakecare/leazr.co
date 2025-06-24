
-- Supprimer complètement les fonctions existantes pour forcer leur recréation
DROP FUNCTION IF EXISTS public.insert_offer_equipment_secure(uuid, text, numeric, integer, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.insert_offer_equipment_attributes_secure(uuid, jsonb);
DROP FUNCTION IF EXISTS public.insert_offer_equipment_specifications_secure(uuid, jsonb);

-- Recréer la fonction pour insérer les équipements d'offre de manière sécurisée
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
SET search_path = 'public'
AS $$
DECLARE
  new_equipment_id uuid;
  current_user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  current_user_id := auth.uid();
  
  -- Vérifier que l'utilisateur est authentifié
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- Vérifier que l'utilisateur a le droit de modifier cette offre
  IF NOT EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = p_offer_id 
    AND (o.user_id = current_user_id OR o.ambassador_id IN (
      SELECT a.id FROM public.ambassadors a WHERE a.user_id = current_user_id
    ))
  ) THEN
    RAISE EXCEPTION 'Permission refusée pour cette offre';
  END IF;
  
  -- Insérer l'équipement
  INSERT INTO public.offer_equipment (
    offer_id,
    title,
    purchase_price,
    quantity,
    margin,
    monthly_payment,
    serial_number
  )
  VALUES (
    p_offer_id,
    p_title,
    p_purchase_price,
    p_quantity,
    p_margin,
    p_monthly_payment,
    p_serial_number
  )
  RETURNING id INTO new_equipment_id;
  
  RETURN new_equipment_id;
END;
$$;

-- Recréer la fonction pour insérer les attributs d'équipement
CREATE OR REPLACE FUNCTION public.insert_offer_equipment_attributes_secure(
  p_equipment_id uuid,
  p_attributes jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attr_key text;
  attr_value text;
  current_user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  current_user_id := auth.uid();
  
  -- Vérifier que l'utilisateur est authentifié
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- Vérifier que l'utilisateur a le droit de modifier cet équipement
  IF NOT EXISTS (
    SELECT 1 FROM public.offer_equipment oe
    JOIN public.offers o ON oe.offer_id = o.id
    WHERE oe.id = p_equipment_id 
    AND (o.user_id = current_user_id OR o.ambassador_id IN (
      SELECT a.id FROM public.ambassadors a WHERE a.user_id = current_user_id
    ))
  ) THEN
    RAISE EXCEPTION 'Permission refusée pour cet équipement';
  END IF;
  
  -- Insérer chaque attribut
  FOR attr_key, attr_value IN SELECT * FROM jsonb_each_text(p_attributes)
  LOOP
    INSERT INTO public.offer_equipment_attributes (
      equipment_id,
      key,
      value
    )
    VALUES (
      p_equipment_id,
      attr_key,
      attr_value
    );
  END LOOP;
  
  RETURN true;
END;
$$;

-- Recréer la fonction pour insérer les spécifications d'équipement
CREATE OR REPLACE FUNCTION public.insert_offer_equipment_specifications_secure(
  p_equipment_id uuid,
  p_specifications jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  spec_key text;
  spec_value text;
  current_user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  current_user_id := auth.uid();
  
  -- Vérifier que l'utilisateur est authentifié
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- Vérifier que l'utilisateur a le droit de modifier cet équipement
  IF NOT EXISTS (
    SELECT 1 FROM public.offer_equipment oe
    JOIN public.offers o ON oe.offer_id = o.id
    WHERE oe.id = p_equipment_id 
    AND (o.user_id = current_user_id OR o.ambassador_id IN (
      SELECT a.id FROM public.ambassadors a WHERE a.user_id = current_user_id
    ))
  ) THEN
    RAISE EXCEPTION 'Permission refusée pour cet équipement';
  END IF;
  
  -- Insérer chaque spécification
  FOR spec_key, spec_value IN SELECT * FROM jsonb_each_text(p_specifications)
  LOOP
    INSERT INTO public.offer_equipment_specifications (
      equipment_id,
      key,
      value
    )
    VALUES (
      p_equipment_id,
      spec_key,
      spec_value
    );
  END LOOP;
  
  RETURN true;
END;
$$;
