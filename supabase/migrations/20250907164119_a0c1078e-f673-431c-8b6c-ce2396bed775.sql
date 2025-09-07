-- Corriger la fonction pour régler les avertissements de sécurité et ajuster le calcul
DROP FUNCTION IF EXISTS public.update_equipment_with_global_margin(UUID, NUMERIC);

-- Fonction corrigée pour atteindre une mensualité cible spécifique
CREATE OR REPLACE FUNCTION public.recalculate_offer_to_target_monthly(
  p_offer_id UUID,
  p_target_monthly_payment NUMERIC
) RETURNS TABLE(
  equipment_id UUID,
  old_selling_price NUMERIC,
  new_selling_price NUMERIC,
  old_monthly_payment NUMERIC,
  new_monthly_payment NUMERIC,
  coefficient NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_purchase_price NUMERIC := 0;
  target_financed_amount NUMERIC;
  global_coefficient NUMERIC := 3.1602; -- Coefficient Grenke exact
  equipment_record RECORD;
  equipment_purchase_total NUMERIC;
  proportion NUMERIC;
  new_selling_price_calc NUMERIC;
  new_monthly_payment_calc NUMERIC;
BEGIN
  -- Calculer le montant financé cible à partir de la mensualité
  target_financed_amount := (p_target_monthly_payment * 100) / global_coefficient;
  
  -- Calculer le prix d'achat total actuel
  SELECT SUM(purchase_price * quantity) INTO total_purchase_price
  FROM public.offer_equipment
  WHERE offer_id = p_offer_id;
  
  -- Mettre à jour chaque équipement proportionnellement
  FOR equipment_record IN 
    SELECT id, purchase_price, quantity, selling_price, monthly_payment
    FROM public.offer_equipment
    WHERE offer_id = p_offer_id
  LOOP
    -- Calculer la proportion de cet équipement par rapport au total d'achat
    equipment_purchase_total := equipment_record.purchase_price * equipment_record.quantity;
    proportion := equipment_purchase_total / total_purchase_price;
    
    -- Calculer le nouveau prix de vente proportionnel au montant financé cible
    new_selling_price_calc := target_financed_amount * proportion;
    
    -- Calculer la nouvelle mensualité proportionnelle
    new_monthly_payment_calc := (new_selling_price_calc * global_coefficient) / 100;
    
    -- Mettre à jour l'équipement
    UPDATE public.offer_equipment
    SET 
      selling_price = new_selling_price_calc / equipment_record.quantity, -- Prix unitaire
      monthly_payment = new_monthly_payment_calc / equipment_record.quantity, -- Mensualité unitaire
      coefficient = global_coefficient,
      updated_at = now()
    WHERE id = equipment_record.id;
    
    -- Retourner les résultats pour debugging
    RETURN QUERY SELECT 
      equipment_record.id,
      equipment_record.selling_price,
      new_selling_price_calc / equipment_record.quantity,
      equipment_record.monthly_payment,
      new_monthly_payment_calc / equipment_record.quantity,
      global_coefficient;
  END LOOP;
  
  -- Mettre à jour l'offre avec les valeurs correctes
  UPDATE public.offers
  SET 
    amount = target_financed_amount,
    financed_amount = target_financed_amount,
    coefficient = global_coefficient,
    monthly_payment = p_target_monthly_payment,
    updated_at = now()
  WHERE id = p_offer_id;
  
END;
$$;

-- Recalculer l'offre pour atteindre exactement 226.84€ de mensualité
SELECT * FROM public.recalculate_offer_to_target_monthly(
  'ae3f4882-78da-41ee-88ed-3236469793c8'::UUID, 
  226.84
);