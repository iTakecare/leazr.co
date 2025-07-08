-- Correction de l'isolation des données - Approche sécurisée
-- Cette migration corrige les problèmes d'assignation incorrecte des utilisateurs

-- 1. D'abord, créer des entreprises temporaires pour les profils sans company_id valide
-- pour éviter les violations de contrainte NOT NULL

-- Créer des entreprises pour les ambassadeurs sans entreprise assignée
INSERT INTO public.companies (name, plan, account_status, created_at)
SELECT 
  'Entreprise ' || p.first_name || ' ' || p.last_name,
  'starter',
  'trial',
  now()
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE p.company_id IS NULL OR c.id IS NULL;

-- 2. Assigner ces nouvelles entreprises aux profils orphelins
WITH orphaned_profiles AS (
  SELECT p.id as profile_id, 
         ROW_NUMBER() OVER (ORDER BY p.created_at) as rn
  FROM public.profiles p
  LEFT JOIN public.companies c ON p.company_id = c.id
  WHERE p.company_id IS NULL OR c.id IS NULL
),
new_companies AS (
  SELECT id as company_id,
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM public.companies
  WHERE name LIKE 'Entreprise %'
)
UPDATE public.profiles 
SET company_id = nc.company_id
FROM orphaned_profiles op
JOIN new_companies nc ON op.rn = nc.rn
WHERE profiles.id = op.profile_id;

-- 3. Maintenant corriger les assignations incorrectes d'iTakecare
-- Créer des entreprises individuelles pour les utilisateurs non-iTakecare assignés à iTakecare
WITH incorrect_assignments AS (
  SELECT p.id as profile_id, p.first_name, p.last_name, u.email
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  JOIN public.companies c ON p.company_id = c.id
  WHERE c.name = 'iTakecare' 
  AND u.email NOT LIKE '%itakecare.be%'
)
INSERT INTO public.companies (name, plan, account_status, created_at)
SELECT 
  CASE 
    WHEN ia.first_name IS NOT NULL AND ia.last_name IS NOT NULL 
    THEN 'Entreprise ' || ia.first_name || ' ' || ia.last_name
    ELSE 'Entreprise Demo ' || SUBSTRING(ia.email FROM 1 FOR POSITION('@' IN ia.email) - 1)
  END,
  'starter',
  'trial',
  now()
FROM incorrect_assignments ia;

-- 4. Réassigner ces utilisateurs à leurs nouvelles entreprises
WITH incorrect_assignments AS (
  SELECT p.id as profile_id, p.first_name, p.last_name, u.email,
         ROW_NUMBER() OVER (ORDER BY p.created_at) as rn
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  JOIN public.companies c ON p.company_id = c.id
  WHERE c.name = 'iTakecare' 
  AND u.email NOT LIKE '%itakecare.be%'
),
new_individual_companies AS (
  SELECT id as company_id,
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM public.companies
  WHERE name NOT LIKE 'iTakecare'
  AND name LIKE 'Entreprise %'
  AND created_at > (SELECT MAX(created_at) - INTERVAL '1 minute' FROM public.companies WHERE name LIKE 'Entreprise %')
)
UPDATE public.profiles 
SET company_id = nic.company_id
FROM incorrect_assignments ia
JOIN new_individual_companies nic ON ia.rn = nic.rn
WHERE profiles.id = ia.profile_id;