-- Corriger le leaser du contrat Frederic Veillard
UPDATE contracts
SET 
  leaser_id = '38cbd156-82cc-43dc-8205-acd9ea692d9f',
  leaser_name = '3. iTakecare',
  updated_at = now()
WHERE id = 'd508367b-513f-401c-b611-9ca2af81039a';

-- Corriger la faute de frappe dans le nom du leaser
UPDATE leasers
SET 
  name = '3. iTakecare',
  updated_at = now()
WHERE id = '38cbd156-82cc-43dc-8205-acd9ea692d9f';