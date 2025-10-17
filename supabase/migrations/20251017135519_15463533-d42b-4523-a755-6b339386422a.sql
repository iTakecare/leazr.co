-- Ajouter les paramètres de facturation aux leasers
ALTER TABLE public.leasers 
ADD COLUMN IF NOT EXISTS billing_frequency text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS contract_start_rule text DEFAULT 'next_month_first';

-- Contraintes pour valider les valeurs
ALTER TABLE public.leasers
DROP CONSTRAINT IF EXISTS leasers_billing_frequency_check,
ADD CONSTRAINT leasers_billing_frequency_check 
CHECK (billing_frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual'));

ALTER TABLE public.leasers
DROP CONSTRAINT IF EXISTS leasers_contract_start_rule_check,
ADD CONSTRAINT leasers_contract_start_rule_check 
CHECK (contract_start_rule IN (
  'next_month_first',
  'next_quarter_first',
  'next_semester_first',
  'next_year_first',
  'delivery_date',
  'delivery_date_plus_15'
));

COMMENT ON COLUMN public.leasers.billing_frequency IS 'Fréquence de facturation du leaser';
COMMENT ON COLUMN public.leasers.contract_start_rule IS 'Règle de calcul de la date de début du contrat';

-- Ajouter la date de livraison effective aux contrats
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS delivery_date date;

COMMENT ON COLUMN public.contracts.delivery_date IS 'Date de livraison effective du matériel';

-- Fonction pour calculer la date de début de contrat selon la règle du leaser
CREATE OR REPLACE FUNCTION public.calculate_contract_start_date_with_rule(
  p_delivery_date date,
  p_contract_start_rule text
) RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  start_date date;
  current_quarter int;
  current_semester int;
BEGIN
  IF p_delivery_date IS NULL THEN
    RETURN NULL;
  END IF;

  CASE p_contract_start_rule
    -- 1er jour du mois suivant
    WHEN 'next_month_first' THEN
      start_date := DATE_TRUNC('month', p_delivery_date + INTERVAL '1 month')::date;
    
    -- 1er jour du trimestre suivant
    WHEN 'next_quarter_first' THEN
      current_quarter := EXTRACT(QUARTER FROM p_delivery_date);
      start_date := DATE_TRUNC('year', p_delivery_date)::date + 
                    INTERVAL '3 months' * current_quarter;
    
    -- 1er jour du semestre suivant
    WHEN 'next_semester_first' THEN
      current_semester := CASE 
        WHEN EXTRACT(MONTH FROM p_delivery_date) <= 6 THEN 1 
        ELSE 2 
      END;
      start_date := DATE_TRUNC('year', p_delivery_date)::date + 
                    INTERVAL '6 months' * current_semester;
    
    -- 1er jour de l'année suivante
    WHEN 'next_year_first' THEN
      start_date := DATE_TRUNC('year', p_delivery_date + INTERVAL '1 year')::date;
    
    -- Date de livraison exacte
    WHEN 'delivery_date' THEN
      start_date := p_delivery_date;
    
    -- Date de livraison + 15 jours
    WHEN 'delivery_date_plus_15' THEN
      start_date := p_delivery_date + INTERVAL '15 days';
    
    ELSE
      -- Par défaut : 1er du mois suivant
      start_date := DATE_TRUNC('month', p_delivery_date + INTERVAL '1 month')::date;
  END CASE;

  RETURN start_date;
END;
$$;

COMMENT ON FUNCTION public.calculate_contract_start_date_with_rule IS 
'Calcule la date de début de contrat en fonction de la date de livraison et de la règle du leaser';

-- Trigger pour calculer automatiquement contract_start_date
CREATE OR REPLACE FUNCTION public.auto_calculate_contract_start_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  leaser_rule text;
BEGIN
  -- Si delivery_date est renseigné et contract_start_date n'est pas déjà défini manuellement
  IF NEW.delivery_date IS NOT NULL THEN
    -- Récupérer la règle du leaser
    SELECT contract_start_rule INTO leaser_rule
    FROM public.leasers
    WHERE name = NEW.leaser_name
    LIMIT 1;
    
    -- Calculer la date de début si une règle existe
    IF leaser_rule IS NOT NULL THEN
      NEW.contract_start_date := calculate_contract_start_date_with_rule(
        NEW.delivery_date, 
        leaser_rule
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attacher le trigger à la table contracts
DROP TRIGGER IF EXISTS trigger_auto_calculate_contract_start_date ON public.contracts;
CREATE TRIGGER trigger_auto_calculate_contract_start_date
  BEFORE INSERT OR UPDATE OF delivery_date
  ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_contract_start_date();

-- Mettre à jour les leasers existants avec leurs paramètres spécifiques
UPDATE public.leasers 
SET 
  billing_frequency = 'quarterly',
  contract_start_rule = 'next_quarter_first'
WHERE name ILIKE '%grenke%';

UPDATE public.leasers 
SET 
  billing_frequency = 'monthly',
  contract_start_rule = 'next_month_first'
WHERE name ILIKE '%atlance%';