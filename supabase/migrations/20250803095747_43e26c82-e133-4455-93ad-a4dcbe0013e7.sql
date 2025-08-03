-- Créer le profil manquant pour l'admin SaaS avec le bon rôle
INSERT INTO public.profiles (
  id, 
  first_name, 
  last_name, 
  role, 
  company_id,
  created_at,
  updated_at
) VALUES (
  'b0fd26dd-a826-4bdc-80e8-772890002607',
  'Admin',
  'SaaS',
  'admin',
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  now(),
  now()
);