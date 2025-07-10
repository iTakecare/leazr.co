-- Corriger les politiques RLS multiples et contradictoires pour les leasers et products

-- ======= NETTOYAGE DES LEASERS =======
-- Supprimer toutes les politiques existantes sur leasers
DROP POLICY IF EXISTS "leasers_company_strict_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_strict_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_access" ON public.leasers;

-- Créer UNE SEULE politique claire pour les leasers
CREATE POLICY "leasers_company_isolation" 
ON public.leasers 
FOR ALL 
USING (
  -- Permettre l'accès si :
  -- 1. L'utilisateur appartient à la même entreprise que le leaser
  -- 2. OU l'utilisateur est admin
  (company_id = get_user_company_id()) OR is_admin_optimized()
)
WITH CHECK (
  -- Pour les modifications, même logique
  (company_id = get_user_company_id()) OR is_admin_optimized()
);

-- ======= NETTOYAGE DES PRODUCTS =======
-- Supprimer toutes les politiques existantes sur products (il y en a 6)
DROP POLICY IF EXISTS "products_company_isolation" ON public.products;
DROP POLICY IF EXISTS "products_strict_company_isolation" ON public.products;
DROP POLICY IF EXISTS "products_access" ON public.products;
DROP POLICY IF EXISTS "products_admin_access" ON public.products;
DROP POLICY IF EXISTS "products_company_access" ON public.products;
DROP POLICY IF EXISTS "products_user_access" ON public.products;

-- Créer UNE SEULE politique claire pour les products
CREATE POLICY "products_company_isolation" 
ON public.products 
FOR ALL 
USING (
  -- Permettre l'accès si :
  -- 1. L'utilisateur appartient à la même entreprise que le produit
  -- 2. OU l'utilisateur est admin
  (company_id = get_user_company_id()) OR is_admin_optimized()
)
WITH CHECK (
  -- Pour les modifications, même logique
  (company_id = get_user_company_id()) OR is_admin_optimized()
);

-- ======= RECRÉER DES DONNÉES DE TEST POUR ITAKECARE =======
-- Supprimer les anciens leasers d'iTakecare s'ils existent
DELETE FROM public.leasers WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

-- Recréer des leasers pour iTakecare
INSERT INTO public.leasers (
  name, 
  email, 
  phone, 
  company_id,
  created_at
) VALUES 
(
  'iTakecare Leasing', 
  'leasing@itakecare.be', 
  '+32 2 123 45 67', 
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  now()
),
(
  'iTakecare Finance', 
  'finance@itakecare.be', 
  '+32 2 123 45 68', 
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  now()
);

-- Supprimer les anciens produits d'iTakecare s'ils existent
DELETE FROM public.products WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

-- Recréer quelques produits de test pour iTakecare (sans dépendances pour éviter les erreurs)
INSERT INTO public.products (
  name,
  description,
  price,
  company_id,
  created_at
) VALUES 
(
  'MacBook Pro 16"',
  'Ordinateur portable professionnel Apple',
  2500.00,
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  now()
),
(
  'Dell OptiPlex 7000',
  'Ordinateur de bureau professionnel Dell',
  1200.00,
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  now()
),
(
  'iPhone 15 Pro',
  'Smartphone Apple dernière génération',
  1200.00,
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  now()
);