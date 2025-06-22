
-- Compter le nombre total de leasers
SELECT COUNT(*) as total_leasers FROM leasers;

-- Voir tous les leasers avec leurs détails
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

-- Vérifier s'il y a des tranches sans leaser
SELECT COUNT(*) as orphaned_ranges 
FROM leaser_ranges lr 
WHERE lr.leaser_id NOT IN (SELECT id FROM leasers);
