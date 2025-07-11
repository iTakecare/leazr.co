-- Supprimer la contrainte d'unicité sur domain si elle existe
ALTER TABLE public.company_domains DROP CONSTRAINT IF EXISTS company_domains_domain_key;

-- Créer une contrainte d'unicité sur la combinaison subdomain + domain
ALTER TABLE public.company_domains ADD CONSTRAINT company_domains_subdomain_domain_unique UNIQUE (subdomain, domain);

-- Maintenant créer l'entrée pour ALizz SRL
INSERT INTO public.company_domains (
  company_id, 
  domain, 
  subdomain, 
  is_active, 
  is_primary
) VALUES (
  'b501f123-2c3f-4855-81d1-ceb32afb9ff0',
  'leazr.co',
  'alizz',
  true,
  true
);