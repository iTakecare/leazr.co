-- Update all contracts with self-leasing leasers (including the new one)
UPDATE contracts c
SET is_self_leasing = true
FROM leasers l
WHERE c.leaser_name = l.name
  AND l.is_own_company = true
  AND (c.is_self_leasing = false OR c.is_self_leasing IS NULL);