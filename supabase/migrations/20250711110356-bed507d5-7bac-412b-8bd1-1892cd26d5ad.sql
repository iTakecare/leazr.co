-- Créer l'entrée dans company_domains pour iTakecare
INSERT INTO public.company_domains (
  company_id, 
  domain, 
  subdomain, 
  is_active, 
  is_primary
) VALUES (
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  'leazr.co',
  'itakecare',
  true,
  true
) ON CONFLICT (company_id, subdomain) DO NOTHING;