
-- Supprimer les anciennes politiques qui causent des problèmes
DROP POLICY IF EXISTS "ambassadors_can_view_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "admins_can_view_all_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "ambassadors_can_view_offer_notes" ON offer_notes;
DROP POLICY IF EXISTS "admins_can_view_all_offer_notes" ON offer_notes;
DROP POLICY IF EXISTS "ambassadors_can_view_offer_workflow_logs" ON offer_workflow_logs;
DROP POLICY IF EXISTS "admins_can_view_all_offer_workflow_logs" ON offer_workflow_logs;

-- Recréer les politiques pour offer_equipment avec une approche plus directe
CREATE POLICY "users_can_view_offer_equipment" ON offer_equipment
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_equipment.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM ambassadors a 
        WHERE a.id = o.ambassador_id 
        AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Recréer les politiques pour offer_notes
CREATE POLICY "users_can_view_offer_notes" ON offer_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_notes.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM ambassadors a 
        WHERE a.id = o.ambassador_id 
        AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Recréer les politiques pour offer_workflow_logs
CREATE POLICY "users_can_view_offer_workflow_logs" ON offer_workflow_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_workflow_logs.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM ambassadors a 
        WHERE a.id = o.ambassador_id 
        AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Ajouter des politiques pour les insertions/modifications si nécessaire
CREATE POLICY "users_can_insert_offer_notes" ON offer_notes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_notes.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM ambassadors a 
        WHERE a.id = o.ambassador_id 
        AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin')
      )
    )
  )
);

CREATE POLICY "users_can_insert_offer_workflow_logs" ON offer_workflow_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_workflow_logs.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM ambassadors a 
        WHERE a.id = o.ambassador_id 
        AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin')
      )
    )
  )
);
