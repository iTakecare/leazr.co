
-- Supprimer toutes les anciennes politiques conflictuelles sur offer_equipment
DROP POLICY IF EXISTS "offer_equipment_access" ON offer_equipment;
DROP POLICY IF EXISTS "offer_equipment_company_access" ON offer_equipment;
DROP POLICY IF EXISTS "users_can_view_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "users_can_insert_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "users_can_update_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "users_can_delete_offer_equipment" ON offer_equipment;

-- Supprimer toutes les anciennes politiques conflictuelles sur offer_notes
DROP POLICY IF EXISTS "offer_notes_access" ON offer_notes;
DROP POLICY IF EXISTS "offer_notes_company_access" ON offer_notes;
DROP POLICY IF EXISTS "users_can_view_offer_notes" ON offer_notes;
DROP POLICY IF EXISTS "users_can_insert_offer_notes" ON offer_notes;

-- Supprimer toutes les anciennes politiques conflictuelles sur offer_workflow_logs
DROP POLICY IF EXISTS "offer_workflow_logs_access" ON offer_workflow_logs;
DROP POLICY IF EXISTS "offer_workflow_logs_company_access" ON offer_workflow_logs;
DROP POLICY IF EXISTS "users_can_view_offer_workflow_logs" ON offer_workflow_logs;
DROP POLICY IF EXISTS "users_can_insert_offer_workflow_logs" ON offer_workflow_logs;

-- Supprimer toutes les anciennes politiques conflictuelles sur offer_equipment_attributes
DROP POLICY IF EXISTS "offer_equipment_attributes_company_access" ON offer_equipment_attributes;
DROP POLICY IF EXISTS "users_can_view_offer_equipment_attributes" ON offer_equipment_attributes;
DROP POLICY IF EXISTS "users_can_insert_offer_equipment_attributes" ON offer_equipment_attributes;

-- Supprimer toutes les anciennes politiques conflictuelles sur offer_equipment_specifications
DROP POLICY IF EXISTS "offer_equipment_specifications_company_access" ON offer_equipment_specifications;
DROP POLICY IF EXISTS "users_can_view_offer_equipment_specifications" ON offer_equipment_specifications;
DROP POLICY IF EXISTS "users_can_insert_offer_equipment_specifications" ON offer_equipment_specifications;

-- Créer des politiques simples et correctes pour offer_equipment
CREATE POLICY "ambassador_offer_equipment_access" ON offer_equipment
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_equipment.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR (o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      ))
      OR public.is_admin_or_ambassador()
    )
  )
);

-- Créer des politiques simples et correctes pour offer_notes
CREATE POLICY "ambassador_offer_notes_access" ON offer_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_notes.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR (o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      ))
      OR public.is_admin_or_ambassador()
    )
  )
);

-- Créer des politiques simples et correctes pour offer_workflow_logs
CREATE POLICY "ambassador_offer_workflow_logs_access" ON offer_workflow_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_workflow_logs.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR (o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      ))
      OR public.is_admin_or_ambassador()
    )
  )
);

-- Créer des politiques simples et correctes pour offer_equipment_attributes
CREATE POLICY "ambassador_offer_equipment_attributes_access" ON offer_equipment_attributes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM offer_equipment oe
    JOIN offers o ON o.id = oe.offer_id
    WHERE oe.id = offer_equipment_attributes.equipment_id 
    AND (
      o.user_id = auth.uid() 
      OR (o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      ))
      OR public.is_admin_or_ambassador()
    )
  )
);

-- Créer des politiques simples et correctes pour offer_equipment_specifications
CREATE POLICY "ambassador_offer_equipment_specifications_access" ON offer_equipment_specifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM offer_equipment oe
    JOIN offers o ON o.id = oe.offer_id
    WHERE oe.id = offer_equipment_specifications.equipment_id 
    AND (
      o.user_id = auth.uid() 
      OR (o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      ))
      OR public.is_admin_or_ambassador()
    )
  )
);
