-- Corriger les niveaux par défaut en double pour les ambassadeurs
-- Ne garder qu'un seul niveau par défaut par type
UPDATE commission_levels 
SET is_default = false 
WHERE type = 'ambassador' 
AND id != 'd0bab095-b9ae-4bde-a55b-74e053d40f29';

-- Corriger les niveaux par défaut en double pour les partenaires  
UPDATE commission_levels 
SET is_default = false 
WHERE type = 'partner' 
AND id != '28f6ec67-1f48-430f-a53e-73be19e42d97';

-- Supprimer les niveaux vides qui ont été créés récemment et n'ont pas de taux
DELETE FROM commission_levels 
WHERE id IN ('0b0f2cff-d71a-4d0b-a638-7fca3fafe84e', '70a7ad61-fae8-489c-8a68-b67ad0cb8406', '444bb03e-071e-4ad4-a63a-1c3036078a1d')
AND NOT EXISTS (
  SELECT 1 FROM commission_rates WHERE commission_level_id = commission_levels.id
);