-- Fix ambassador isolation by cleaning up conflicting RLS policies

-- Drop all existing conflicting policies on ambassadors table
DROP POLICY IF EXISTS "Ambassadors are viewable by company members" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassadors strict company isolation" ON public.ambassadors;
DROP POLICY IF EXISTS "Company admins can delete ambassadors" ON public.ambassadors;
DROP POLICY IF EXISTS "Company admins can insert ambassadors" ON public.ambassadors;
DROP POLICY IF EXISTS "Company admins can update ambassadors" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_access" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_company_access" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_select_policy" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_update_policy" ON public.ambassadors;

-- Create a single, clear policy for complete company isolation
CREATE POLICY "ambassadors_company_isolation" 
ON public.ambassadors 
FOR ALL 
USING (
  (company_id = get_user_company_id()) OR is_admin_optimized()
) 
WITH CHECK (
  (company_id = get_user_company_id()) OR is_admin_optimized()
);