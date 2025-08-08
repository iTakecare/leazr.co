-- Fix RLS policy for offer_equipment to allow client access
DROP POLICY IF EXISTS "offer_equipment_company_access" ON public.offer_equipment;

-- Create new policy that allows access for company users AND clients who own the offer
CREATE POLICY "offer_equipment_secure_access" ON public.offer_equipment
FOR SELECT USING (
  -- Company users can see all equipment from their company
  (offer_id IN (SELECT id FROM offers WHERE company_id = get_user_company_id()))
  OR
  -- Clients can see equipment from their own offers
  (offer_id IN (SELECT id FROM offers WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())))
  OR
  -- Admin access
  is_admin_optimized()
);

-- Also fix the attributes and specifications tables
DROP POLICY IF EXISTS "offer_equipment_attributes_company_access" ON public.offer_equipment_attributes;
CREATE POLICY "offer_equipment_attributes_secure_access" ON public.offer_equipment_attributes
FOR SELECT USING (
  equipment_id IN (
    SELECT oe.id FROM offer_equipment oe 
    JOIN offers o ON oe.offer_id = o.id 
    WHERE o.company_id = get_user_company_id() 
    OR o.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR is_admin_optimized()
  )
);

DROP POLICY IF EXISTS "offer_equipment_specifications_company_access" ON public.offer_equipment_specifications;
CREATE POLICY "offer_equipment_specifications_secure_access" ON public.offer_equipment_specifications
FOR SELECT USING (
  equipment_id IN (
    SELECT oe.id FROM offer_equipment oe 
    JOIN offers o ON oe.offer_id = o.id 
    WHERE o.company_id = get_user_company_id() 
    OR o.client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR is_admin_optimized()
  )
);