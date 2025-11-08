-- Mise à jour des couleurs iTakecare dans company_customizations
UPDATE company_customizations
SET 
  primary_color = '#33638e',
  secondary_color = '#4ab6c4',
  updated_at = now()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';