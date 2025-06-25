
-- Corriger les types d'offres existantes
-- Mettre à jour toutes les offres qui ont un ambassador_id mais sont marquées comme admin_offer
UPDATE public.offers 
SET 
  type = 'ambassador_offer',
  updated_at = now()
WHERE ambassador_id IS NOT NULL 
  AND type = 'admin_offer';

-- Vérifier les résultats de la mise à jour
SELECT 
  COUNT(*) as total_offers_updated,
  'ambassador_offer' as new_type
FROM public.offers 
WHERE ambassador_id IS NOT NULL 
  AND type = 'ambassador_offer';

-- Afficher un échantillon des offres corrigées pour vérification
SELECT 
  id,
  client_name,
  type,
  ambassador_id,
  created_at
FROM public.offers 
WHERE ambassador_id IS NOT NULL 
  AND type = 'ambassador_offer'
ORDER BY created_at DESC
LIMIT 5;
