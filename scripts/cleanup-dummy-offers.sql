-- ============================================================
-- ÉTAPE 1 : Réassigner les offer_id des nouveaux contrats
-- vers une offre réelle du même client
-- ============================================================

-- Ndudi 180-13616 → offer_id du contrat PP existant 180-8339
UPDATE contracts SET offer_id = (
  SELECT offer_id FROM contracts
  WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
    AND contract_number = '180-8339'
  LIMIT 1
)
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND contract_number = '180-13616';

-- Ndudi 180-13620 → offer_id du contrat PP existant 180-11347
UPDATE contracts SET offer_id = (
  SELECT offer_id FROM contracts
  WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
    AND contract_number = '180-11347'
  LIMIT 1
)
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND contract_number = '180-13620';

-- Jadin 180-14069 → offer_id du contrat PP existant 180-9324
UPDATE contracts SET offer_id = (
  SELECT offer_id FROM contracts
  WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
    AND contract_number = '180-9324'
  LIMIT 1
)
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND contract_number = '180-14069';

-- Janssens 180-11404 → offer_id du contrat PP existant 180-9043
UPDATE contracts SET offer_id = (
  SELECT offer_id FROM contracts
  WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
    AND contract_number = '180-9043'
  LIMIT 1
)
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND contract_number = '180-11404';

-- ============================================================
-- ÉTAPE 2 : Supprimer les offres fantômes
-- (celles créées par le SQL, montant_achat=0, Brouillon/approved,
--  liées aux clients Robinson/Ndudi/Jadin/Janssens et créées aujourd'hui)
-- ============================================================

DELETE FROM offers
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND client_name IN ('Michelle Robinson', 'Rosine Ndudi', 'Kevin Jadin', 'Romain Janssens')
  AND converted_to_contract = true
  AND status = 'approved'
  AND created_at::date = CURRENT_DATE
  AND id NOT IN (SELECT offer_id FROM contracts WHERE offer_id IS NOT NULL);

-- ============================================================
-- ÉTAPE 3 : Robinson — supprimer contrat + offre
-- (pas d'offre réelle existante à réutiliser)
-- ============================================================

DELETE FROM contracts
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND contract_number = '180-7201';

DELETE FROM offers
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND client_name = 'Michelle Robinson'
  AND created_at::date = CURRENT_DATE;

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT client_name, contract_number, status, offer_id
FROM contracts
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND contract_number IN ('180-13616','180-13620','180-14069','180-11404')
ORDER BY client_name;
