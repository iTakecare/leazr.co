-- Create the super admin profile for SaaS management
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  role,
  company_id
) VALUES (
  -- This will be the user ID from auth.users for ecommerce@itakecare.be
  -- We'll use a placeholder UUID that matches the auth.users entry
  (SELECT id FROM auth.users WHERE email = 'ecommerce@itakecare.be' LIMIT 1),
  'SaaS',
  'Admin',
  'super_admin',
  -- Set to iTakecare company ID if needed, or NULL for global super admin
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