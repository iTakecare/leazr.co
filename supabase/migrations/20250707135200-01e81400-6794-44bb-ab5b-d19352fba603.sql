-- Créer une offre de test avec user_id pour tester la conversion automatique
INSERT INTO offers (
  client_name,
  client_email,
  equipment_description,
  monthly_payment,
  amount,
  workflow_status,
  status,
  user_id,
  company_id,
  client_id
)
VALUES (
  'Test Conversion',
  'test@example.com',
  'Test MacBook Pro',
  150.0,
  2000.0,
  'approved',
  'pending',
  'b0fd26dd-a826-4bdc-80e8-772890002607',
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  '273c20e8-5569-4198-a0c5-9aea0d7d2317'
);