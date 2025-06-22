
-- Vérifier tous les leasers dans la base de données
SELECT 
  l.id,
  l.name,
  l.logo_url,
  l.company_id,
  l.created_at,
  COUNT(lr.id) as ranges_count
FROM leasers l
LEFT JOIN leaser_ranges lr ON l.id = lr.leaser_id
GROUP BY l.id, l.name, l.logo_url, l.company_id, l.created_at
ORDER BY l.name;

-- Vérifier aussi les tranches de coefficients pour chaque leaser
SELECT 
  l.name as leaser_name,
  lr.min,
  lr.max,
  lr.coefficient
FROM leasers l
LEFT JOIN leaser_ranges lr ON l.id = lr.leaser_id
ORDER BY l.name, lr.min;

-- Vérifier les companies pour comprendre le filtrage
SELECT 
  id,
  name,
  created_at
FROM companies
ORDER BY name;
