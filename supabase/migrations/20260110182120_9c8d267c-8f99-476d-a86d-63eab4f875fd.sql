-- Mettre à jour les contrats qui ont un leaser_id mais pas de leaser_logo
UPDATE contracts c
SET leaser_logo = l.logo_url
FROM leasers l
WHERE c.leaser_id = l.id
  AND c.leaser_logo IS NULL
  AND l.logo_url IS NOT NULL;