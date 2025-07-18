
-- Script pour configurer les domaines d'entreprise pour les sous-domaines
-- À exécuter dans Supabase SQL Editor

-- Exemple : Ajouter iTakecare avec sous-domaine
INSERT INTO company_domains (company_id, domain, subdomain, is_active, is_primary)
SELECT 
  c.id,
  'leazr.co',
  'itakecare',
  true,
  false
FROM companies c 
WHERE c.name ILIKE '%itakecare%'
ON CONFLICT DO NOTHING;

-- Exemple : Ajouter d'autres entreprises avec leurs sous-domaines
-- Remplacer 'nom-entreprise' et 'sous-domaine' par les vraies valeurs

/*
INSERT INTO company_domains (company_id, domain, subdomain, is_active, is_primary)
SELECT 
  c.id,
  'leazr.co',
  'nom-sous-domaine',  -- ex: 'techcorp'
  true,
  false
FROM companies c 
WHERE c.name ILIKE '%nom-entreprise%'  -- ex: '%TechCorp%'
ON CONFLICT DO NOTHING;
*/

-- Vérifier les domaines configurés
SELECT 
  cd.domain,
  cd.subdomain,
  c.name as company_name,
  cd.is_active
FROM company_domains cd
JOIN companies c ON c.id = cd.company_id
ORDER BY c.name;
