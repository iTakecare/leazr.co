-- Mettre à jour les contrats qui ont leaser_name contenant 'grenke' sans le bon leaser_id
UPDATE contracts
SET 
  leaser_id = 'd60b86d7-a129-4a17-a877-e8e5caa66949',
  leaser_name = '1. Grenke Lease'
WHERE leaser_name ILIKE '%grenke%'
  AND (leaser_id IS NULL OR leaser_name NOT LIKE '%. Grenke%')
  AND leaser_name NOT ILIKE '%FR%'
  AND leaser_name NOT ILIKE '%LU%';

-- Mettre à jour les contrats Grenke France
UPDATE contracts
SET 
  leaser_id = 'ab71ad10-8cfa-4c3f-9249-98dd0d59875c',
  leaser_name = '4. Grenke Lease FR'
WHERE leaser_name ILIKE '%grenke%'
  AND leaser_name ILIKE '%FR%'
  AND leaser_id IS NULL;

-- Mettre à jour les contrats Grenke Luxembourg
UPDATE contracts
SET 
  leaser_id = 'a40f04e1-7c45-4e3c-ba21-70c7621db941',
  leaser_name = '5. Grenke Lease LU'
WHERE leaser_name ILIKE '%grenke%'
  AND leaser_name ILIKE '%LU%'
  AND leaser_id IS NULL;