-- Nettoyer les entreprises : ne garder que l'entreprise principale iTakecare
-- Étape 1: Supprimer les entreprises sans utilisateurs ni données associées

-- Supprimer les entreprises qui n'ont pas d'utilisateurs associés (sauf iTakecare Default)
DELETE FROM public.companies 
WHERE id NOT IN (
  SELECT DISTINCT company_id 
  FROM public.profiles 
  WHERE company_id IS NOT NULL
)
AND name != 'iTakecare (Default)';

-- Étape 2: Renommer "iTakecare (Default)" en "iTakecare" 
UPDATE public.companies 
SET 
  name = 'iTakecare',
  updated_at = now()
WHERE name = 'iTakecare (Default)';

-- Étape 3: Nettoyer les éventuels doublons restants qui n'ont pas de données critiques
-- (garder seulement celui qui a le plus d'activité - le plus récent avec des utilisateurs)
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
  WHERE c.name = 'iTakecare'
  GROUP BY c.id, c.name, c.created_at
),
main_company AS (
  SELECT id
  FROM company_stats
  ORDER BY user_count DESC, offer_count DESC, client_count DESC, created_at DESC
  LIMIT 1
)
DELETE FROM public.companies 
WHERE name = 'iTakecare' 
AND id NOT IN (SELECT id FROM main_company);

-- Vérification finale: s'assurer qu'il n'y a qu'une seule entreprise iTakecare
-- Log du résultat
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