-- Supprimer les 72 offers en doublon créées après Collard Yohan
DELETE FROM offers 
WHERE created_at > '2026-03-15 13:16:42.339094+00';

-- Supprimer les clients en doublon qui n'ont plus d'offers rattachées
DELETE FROM clients 
WHERE created_at > '2026-03-15 13:16:42+00'
AND id NOT IN (SELECT DISTINCT client_id FROM offers WHERE client_id IS NOT NULL);