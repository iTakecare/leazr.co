-- Phase 5: User Management - Add RLS policies for user management

-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON public.profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Super admin policies (for iTakecare employees managing the platform)
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

-- Company admin policies (for company administrators)
CREATE POLICY "Company admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  company_id = get_user_company_id() 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Company admins can manage company profiles" 
ON public.profiles 
FOR ALL 
USING (
  company_id = get_user_company_id() 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Function to get users by company with role filtering
CREATE OR REPLACE FUNCTION public.get_company_users(p_company_id UUID, role_filter TEXT DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  has_user_account BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.first_name,
    p.last_name,
    p.role,
    au.created_at,
    au.last_sign_in_at,
    TRUE as has_user_account
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.company_id = p_company_id
    AND (role_filter IS NULL OR p.role = role_filter)
  ORDER BY au.created_at DESC;
END;
$$;

-- Function to create user with company assignment
CREATE OR REPLACE FUNCTION public.create_company_user(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT,
  p_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  user_metadata JSONB;
BEGIN
  -- Create metadata object
  user_metadata := jsonb_build_object(
    'first_name', p_first_name,
    'last_name', p_last_name,
    'role', p_role
  );
  
  -- Create the user in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    user_metadata,
    now(),
    now()
  )
  RETURNING id INTO new_user_id;
  
  -- Create the profile
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id
  )
  VALUES (
    new_user_id,
    p_first_name,
    p_last_name,
    p_role,
    p_company_id
  );
  
  RETURN new_user_id;
END;
$$;

-- Function to update user role and company
CREATE OR REPLACE FUNCTION public.update_company_user(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT,
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    role = p_role,
    company_id = COALESCE(p_company_id, company_id),
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to check if current user can manage other users
CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;