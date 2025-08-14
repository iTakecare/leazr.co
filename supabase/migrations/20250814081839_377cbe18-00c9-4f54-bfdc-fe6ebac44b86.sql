-- Create a profile for the SaaS super admin
INSERT INTO public.profiles (
  id, 
  first_name, 
  last_name, 
  role, 
  company_id
) 
SELECT 
  au.id,
  'SaaS',
  'Admin', 
  'super_admin',
  NULL
FROM auth.users au 
WHERE au.email = 'ecommerce@itakecare.be' 
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);