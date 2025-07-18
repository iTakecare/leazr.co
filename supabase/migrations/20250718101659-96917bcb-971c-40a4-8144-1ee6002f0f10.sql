
-- Modifier la contrainte CHECK pour autoriser 'netlify' comme type d'intégration
ALTER TABLE public.company_integrations 
DROP CONSTRAINT company_integrations_integration_type_check;

ALTER TABLE public.company_integrations 
ADD CONSTRAINT company_integrations_integration_type_check 
CHECK (integration_type IN ('billit', 'other', 'netlify'));
