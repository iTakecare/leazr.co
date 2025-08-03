-- Mettre à NULL la clé API Resend stockée en base pour iTakecare
-- Cela forcera l'utilisation de la clé depuis les secrets d'environnement
UPDATE smtp_settings 
SET resend_api_key = NULL, updated_at = NOW()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';