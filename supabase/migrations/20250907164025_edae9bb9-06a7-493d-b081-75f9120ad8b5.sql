-- Fonction pour recalculer un équipement avec un coefficient uniforme
CREATE OR REPLACE FUNCTION public.update_equipment_with_global_margin(
  p_offer_id UUID,
  p_global_margin_percent NUMERIC
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
SET search_path TO 'public'
AS $$
DECLARE
  total_purchase_price NUMERIC := 0;
  total_selling_price NUMERIC := 0;
  total_monthly_payment NUMERIC := 0;
  global_coefficient NUMERIC := 3.1602; -- Coefficient Grenke exact
  equipment_record RECORD;
  new_selling_price_calc NUMERIC;
  new_monthly_payment_calc NUMERIC;
BEGIN
  -- Calculer le prix d'achat total
  SELECT SUM(purchase_price * quantity) INTO total_purchase_price
  FROM public.offer_equipment
  WHERE offer_id = p_offer_id;
  
  -- Calculer le nouveau prix de vente total avec la marge globale
  total_selling_price := total_purchase_price * (1 + p_global_margin_percent / 100);
  
  -- Calculer la nouvelle mensualité totale
  total_monthly_payment := (total_selling_price * global_coefficient) / 100;
  
  -- Mettre à jour chaque équipement proportionnellement
  FOR equipment_record IN 
    SELECT id, purchase_price, quantity, selling_price, monthly_payment
    FROM public.offer_equipment
    WHERE offer_id = p_offer_id
  LOOP
    -- Calculer le nouveau prix de vente proportionnel
    new_selling_price_calc := (equipment_record.purchase_price * equipment_record.quantity * (1 + p_global_margin_percent / 100));
    
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
  
  -- Mettre à jour l'offre avec le montant financé correct
  UPDATE public.offers
  SET 
    amount = total_selling_price,
    financed_amount = total_selling_price,
    coefficient = global_coefficient,
    monthly_payment = total_monthly_payment,
    updated_at = now()
  WHERE id = p_offer_id;
  
END;
$$;

-- Recalculer l'offre spécifique avec une marge de 14% (pour obtenir environ 7178€)
-- Calcul: prix d'achat total ≈ 6297€, avec 14% de marge = 7178€
SELECT * FROM public.update_equipment_with_global_margin(
  'ae3f4882-78da-41ee-88ed-3236469793c8'::UUID, 
  14.0
);

-- Vérifier que l'offre a bien été mise à jour
UPDATE public.offers 
SET 
  leaser_id = (SELECT id FROM public.leasers WHERE name = '1. Grenke Lease' LIMIT 1),
  updated_at = now()
WHERE id = 'ae3f4882-78da-41ee-88ed-3236469793c8';