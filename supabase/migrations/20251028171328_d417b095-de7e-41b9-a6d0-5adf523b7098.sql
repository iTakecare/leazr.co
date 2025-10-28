-- Migration Partie 1 : Ajout du rôle broker et colonne company_type
-- Étape 1 : Ajouter le type 'broker' à l'enum app_role
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'broker'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'broker';
  END IF;
END $$;

-- Étape 2 : Ajouter la colonne company_type à la table companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'standard'
CHECK (company_type IN ('standard', 'broker'));

-- Étape 3 : Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_companies_type 
ON public.companies(company_type) 
WHERE company_type = 'broker';

COMMENT ON COLUMN public.companies.company_type IS 
'Type de company : standard (entreprise classique) ou broker (courtier indépendant)';