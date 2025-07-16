-- Créer un log de tentative de création du sous-domaine iTakecare
INSERT INTO public.cloudflare_subdomain_logs (
  company_id,
  subdomain,
  status,
  error_message,
  retry_count
) VALUES (
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  'itakecare',
  'pending',
  'Sous-domaine existant en base mais pas créé dans Cloudflare - tentative de création',
  0
);