-- Nettoyer les entreprises en gérant d'abord les contraintes de clé étrangère
-- Étape 1: Identifier l'entreprise principale (celle avec le plus d'utilisateurs et d'activité)

WITH company_stats AS (
  SELECT 
    c.id,
    c.name,
    c.created_at,
    COUNT(DISTINCT p.id) as user_count,
    COUNT(DISTINCT o.id) as offer_count,
    COUNT(DISTINCT cl.id) as client_count
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  LEFT JOIN public.offers o ON c.id = o.company_id  
  LEFT JOIN public.clients cl ON c.id = cl.company_id
  GROUP BY c.id, c.name, c.created_at
),
main_company AS (
  SELECT id, name
  FROM company_stats
  ORDER BY user_count DESC, offer_count DESC, client_count DESC, created_at DESC
  LIMIT 1
)
-- Étape 2: Migrer tous les PDF templates vers l'entreprise principale
UPDATE public.pdf_templates 
SET company_id = (SELECT id FROM main_company)
WHERE company_id NOT IN (SELECT id FROM main_company);

-- Étape 3: Migrer toutes les autres références vers l'entreprise principale
-- Leasers
UPDATE public.leasers 
SET company_id = (
  SELECT c.id 
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  GROUP BY c.id
  ORDER BY COUNT(p.id) DESC
  LIMIT 1
)
WHERE company_id NOT IN (
  SELECT c.id 
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  GROUP BY c.id
  ORDER BY COUNT(p.id) DESC
  LIMIT 1
);

-- Ambassadors
UPDATE public.ambassadors 
SET company_id = (
  SELECT c.id 
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  GROUP BY c.id
  ORDER BY COUNT(p.id) DESC
  LIMIT 1
)
WHERE company_id NOT IN (
  SELECT c.id 
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  GROUP BY c.id
  ORDER BY COUNT(p.id) DESC
  LIMIT 1
);

-- Subscriptions
UPDATE public.subscriptions 
SET company_id = (
  SELECT c.id 
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  GROUP BY c.id
  ORDER BY COUNT(p.id) DESC
  LIMIT 1
)
WHERE company_id NOT IN (
  SELECT c.id 
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  GROUP BY c.id
  ORDER BY COUNT(p.id) DESC
  LIMIT 1
);

-- Étape 4: Supprimer les entreprises inutiles maintenant que toutes les références sont migrées
DELETE FROM public.companies 
WHERE id NOT IN (
  SELECT c.id 
  FROM public.companies c
  LEFT JOIN public.profiles p ON c.id = p.company_id
  GROUP BY c.id
  ORDER BY COUNT(p.id) DESC
  LIMIT 1
);

-- Étape 5: Renommer l'entreprise restante en "iTakecare" si ce n'est pas déjà fait
UPDATE public.companies 
SET 
  name = 'iTakecare',
  updated_at = now()
WHERE name LIKE '%iTakecare%' OR name LIKE '%Default%';

-- Vérification finale
DO $$
DECLARE
  company_count INTEGER;
  company_record RECORD;
BEGIN
  SELECT COUNT(*) INTO company_count FROM public.companies;
  RAISE NOTICE 'Nombre total d''entreprises après nettoyage: %', company_count;
  
  FOR company_record IN SELECT id, name, plan FROM public.companies LOOP
    RAISE NOTICE 'Entreprise restante: % - % (Plan: %)', company_record.id, company_record.name, company_record.plan;
  END LOOP;
END $$;