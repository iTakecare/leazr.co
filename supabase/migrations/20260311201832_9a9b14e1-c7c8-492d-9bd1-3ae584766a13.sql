-- Generate dossier_number for all offers missing one
UPDATE offers o
SET dossier_number = sub.generated_number
FROM (
  SELECT id, 
    'ITC-' || EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::TEXT || '-OFF-' || LPAD(rn::TEXT, 4, '0') as generated_number
  FROM (
    SELECT id, created_at, 
      ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM offers
    WHERE dossier_number IS NULL 
      AND type IN ('web_request', 'custom_pack_request')
  ) numbered
) sub
WHERE o.id = sub.id;