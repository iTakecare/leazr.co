-- ============================================================
-- ÉTAPE 1 : Créer le client Michelle Robinson
-- ============================================================
-- Exécuter dans le SQL Editor de Supabase
-- https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/sql

INSERT INTO clients (
  company_id, first_name, last_name, company,
  vat_number, address, city, zip, country
)
VALUES (
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  'Michelle',
  'Robinson',
  'Mad for Dressage',
  'BE0764738003',
  'Rue St Marcoult(Silly) 56',
  'Silly',
  '7830',
  'BE'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ÉTAPE 2 : Créer le contrat Grenke de Michelle Robinson
-- ============================================================
-- Contrat Grenke 180-7201 : Expired (completed), 3025.48€, 95€/mois, 36 mois
-- Période : 2021-10-01 → 2024-10-01

INSERT INTO contracts (
  company_id, client_id, client_name,
  leaser_name, status,
  monthly_payment, contract_duration,
  contract_start_date, contract_end_date
)
SELECT
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  c.id,
  'Michelle Robinson',
  'Grenke',
  'completed',
  95,
  36,
  '2021-10-01',
  '2024-10-01'
FROM clients c
WHERE c.company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND c.last_name ILIKE '%robinson%'
  AND c.first_name ILIKE '%michelle%'
LIMIT 1;

-- ============================================================
-- ÉTAPE 3 : Créer les contrats PP→Société (soldes restants)
-- ============================================================
-- Ces contrats représentent la partie "société" des contrats Grenke
-- après passage de la personne physique en SRL.
-- Les contrats PP originaux existent déjà en DB.

-- 3a. Kevin Jadin → KJ CONSULT SRL
-- Grenke 180-14069 : ExpiringSoon (active), 3961.89€, 129.95€/mois, 12 mois
-- Période : 2025-07-01 → 2026-07-01

INSERT INTO contracts (
  company_id, client_id, client_name,
  leaser_name, status,
  monthly_payment, contract_duration,
  contract_start_date, contract_end_date
)
SELECT
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  c.client_id,
  c.client_name,
  'Grenke',
  'active',
  129.95,
  12,
  '2025-07-01',
  '2026-07-01'
FROM contracts c
WHERE c.company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND c.leaser_name ILIKE '%grenke%'
  AND c.client_name ILIKE '%jadin%'
  AND c.status != 'cancelled'
LIMIT 1;

-- 3b. Romain Janssens → RM TOITURE ET FERRONNERIE SRL
-- Grenke 180-11404 : Expired (completed), 4143.29€, 135.90€/mois, 27 mois
-- Période : 2024-01-01 → 2026-04-01

INSERT INTO contracts (
  company_id, client_id, client_name,
  leaser_name, status,
  monthly_payment, contract_duration,
  contract_start_date, contract_end_date
)
SELECT
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  c.client_id,
  c.client_name,
  'Grenke',
  'completed',
  135.90,
  27,
  '2024-01-01',
  '2026-04-01'
FROM contracts c
WHERE c.company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND c.leaser_name ILIKE '%grenke%'
  AND c.client_name ILIKE '%janssens%'
  AND c.status != 'cancelled'
LIMIT 1;

-- 3c. Rosine Ndudi → COHEA SRL (solde contrat 180-11347, 1384€)
-- Grenke 180-13616 : RunningContract (active), 1384.62€, 50.40€/mois, 27 mois
-- Période : 2025-04-01 → 2027-07-01

INSERT INTO contracts (
  company_id, client_id, client_name,
  leaser_name, status,
  monthly_payment, contract_duration,
  contract_start_date, contract_end_date
)
SELECT
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  c.client_id,
  c.client_name,
  'Grenke',
  'active',
  50.40,
  27,
  '2025-04-01',
  '2027-07-01'
FROM contracts c
WHERE c.company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND c.leaser_name ILIKE '%grenke%'
  AND c.client_name ILIKE '%ndudi%'
  AND c.status != 'cancelled'
LIMIT 1;

-- 3d. Rosine Ndudi → COHEA SRL (solde contrat 180-8339, 2786€)
-- Grenke 180-13620 : Expired (completed), 2786.62€, 87.50€/mois, 6 mois
-- Période : 2025-04-01 → 2025-10-01

INSERT INTO contracts (
  company_id, client_id, client_name,
  leaser_name, status,
  monthly_payment, contract_duration,
  contract_start_date, contract_end_date
)
SELECT
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  c.client_id,
  c.client_name,
  'Grenke',
  'completed',
  87.50,
  6,
  '2025-04-01',
  '2025-10-01'
FROM contracts c
WHERE c.company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND c.leaser_name ILIKE '%grenke%'
  AND c.client_name ILIKE '%ndudi%'
  AND c.status != 'cancelled'
LIMIT 1;

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- Après exécution, vérifier que les entrées ont bien été créées :

SELECT client_name, leaser_name, status, monthly_payment,
       contract_start_date, contract_end_date, contract_number
FROM contracts
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND leaser_name ILIKE '%grenke%'
  AND client_name ILIKE ANY(ARRAY['%robinson%','%jadin%','%janssens%','%ndudi%'])
ORDER BY client_name, contract_start_date;
