-- CORRECTION CRITIQUE DE L'ISOLATION DES LEASERS ENTRE ENTREPRISES
-- Problème: Alain Lizz voit les leasers d'iTakecare à cause de politiques RLS défectueuses
-- Solution: Nettoyer complètement et recréer des politiques RLS strictes

-- Étape 1: Supprimer TOUTES les politiques existantes sur la table leasers
DROP POLICY IF EXISTS "Leasers strict company isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_complete_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_itakecare_bypass" ON public.leasers;
DROP POLICY IF EXISTS "leasers_admin" ON public.leasers;
DROP POLICY IF EXISTS "leasers_admin_write" ON public.leasers;
DROP POLICY IF EXISTS "leasers_read_all" ON public.leasers;
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;

-- Étape 2: Créer des politiques RLS strictes et sécurisées

-- 1. Politique principale: Accès UNIQUEMENT aux leasers de son entreprise
CREATE POLICY "leasers_company_strict_isolation" 
ON public.leasers 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (
    -- Le leaser appartient à la même entreprise que l'utilisateur
    (company_id = get_user_company_id()) OR 
    -- Exception UNIQUEMENT pour les super admins iTakecare
    (
      is_admin_optimized() AND 
      get_current_user_email() LIKE '%@itakecare.be' AND 
      get_user_company_id() = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
    )
  )
)
WITH CHECK (
  -- Pour les modifications: STRICT - pas d'exception super admin
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id())
);

-- Étape 3: Créer des leasers par défaut pour l'entreprise d'Alain Lizz
-- Company ID d'Alain Lizz: b501f123-2c3f-4855-81d1-ceb32afb9ff0
INSERT INTO public.leasers (
  id,
  name,
  company_name,
  email,
  phone,
  address,
  city,
  postal_code,
  country,
  company_id,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Financement Express',
  'Financement Express SAS',
  'contact@financement-express.fr',
  '+33 1 45 67 89 01',
  '123 Avenue de la République',
  'Paris',
  '75011',
  'France',
  'b501f123-2c3f-4855-81d1-ceb32afb9ff0',
  now(),
  now()
),
(
  gen_random_uuid(),
  'LeasePro Solutions',
  'LeasePro Solutions SARL',
  'info@leasepro-solutions.fr',
  '+33 1 56 78 90 12',
  '456 Rue de la Paix',
  'Lyon',
  '69002',
  'France',
  'b501f123-2c3f-4855-81d1-ceb32afb9ff0',
  now(),
  now()
),
(
  gen_random_uuid(),
  'Capital Finance',
  'Capital Finance SA',
  'commercial@capital-finance.fr',
  '+33 1 67 89 01 23',
  '789 Boulevard Haussmann',
  'Marseille',
  '13001',
  'France',
  'b501f123-2c3f-4855-81d1-ceb32afb9ff0',
  now(),
  now()
)
ON CONFLICT DO NOTHING;