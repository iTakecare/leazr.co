-- Fix collaborators RLS policies to avoid direct auth.users references

-- Drop existing problematic policies
DROP POLICY IF EXISTS "collaborators_company_access" ON public.collaborators;

-- Create new RLS policy using security definer functions
CREATE POLICY "collaborators_company_access" 
ON public.collaborators 
FOR ALL 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
) 
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);