-- Fix infinite recursion in RLS policies for profiles table

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON public.profiles;

-- Create simpler, non-recursive policies for profiles
CREATE POLICY "Company admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.company_id = profiles.company_id OR p.role = 'super_admin')
  )
);

CREATE POLICY "Company admins can manage company profiles" 
ON public.profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    AND (p.company_id = profiles.company_id OR p.role = 'super_admin')
  )
);

-- Update the get_user_company_id function to use a more direct approach
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Create a simpler function for role checking that doesn't use get_user_company_id
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;