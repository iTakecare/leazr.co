-- Add super_admin to allowed roles in the check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'client'::text, 'partner'::text, 'ambassador'::text, 'super_admin'::text]));

-- Now create the super admin profile for SaaS management
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  role,
  company_id
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'ecommerce@itakecare.be' LIMIT 1),
  'SaaS',
  'Admin',
  'super_admin',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- Ensure hello@itakecare.be has the correct admin role and company association
UPDATE public.profiles 
SET 
  role = 'admin',
  company_id = (SELECT id FROM companies WHERE name = 'iTakecare' LIMIT 1)
WHERE id = (SELECT id FROM auth.users WHERE email = 'hello@itakecare.be' LIMIT 1);