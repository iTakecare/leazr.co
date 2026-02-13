-- Temporary: update contract_equipment statuses to 'received' except excluded contracts
UPDATE contract_equipment
SET order_status = 'received', reception_date = NOW()
WHERE contract_id NOT IN (
  'a82d1ae5-9a91-4a76-9896-7b11b1116c75',
  '3bb47d1e-b6bf-42e3-af6b-a7a5f7f11471',
  '6ec7a293-880d-42ae-8a53-968d6edb6637',
  '8f778adf-ea02-4d2f-837d-dbf4cb888787',
  'c3e0ac85-33f4-4f13-85d7-72cf169f68f3',
  '6aca4456-6547-4946-bfa4-93784c905faf',
  '752e4a02-ec92-474c-8562-300126ce1f99',
  '998d5bee-7fe1-4957-b4fe-fe514e127da0'
)
AND (order_status IS NULL OR order_status != 'received');

-- Update offer_equipment statuses to 'received' for accepted offers
UPDATE offer_equipment
SET order_status = 'received', reception_date = NOW()
WHERE offer_id IN (
  SELECT id FROM offers WHERE workflow_status = 'accepted'
)
AND (order_status IS NULL OR order_status != 'received');