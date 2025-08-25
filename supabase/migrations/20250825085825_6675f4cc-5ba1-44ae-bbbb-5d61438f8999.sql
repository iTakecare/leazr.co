-- Fix final security issue: Add RLS policy for partner_commissions table

-- Add comprehensive RLS policy for partner_commissions table
CREATE POLICY "partner_commissions_company_access" 
ON public.partner_commissions
FOR ALL
USING (
  -- Allow access to partner commissions within the same company
  (partner_id IN (
    SELECT p.id 
    FROM partners p 
    WHERE p.company_id = get_user_company_id()
  )) 
  OR is_admin_optimized()
)
WITH CHECK (
  -- Same restrictions for modifications
  (partner_id IN (
    SELECT p.id 
    FROM partners p 
    WHERE p.company_id = get_user_company_id()
  )) 
  OR is_admin_optimized()
);