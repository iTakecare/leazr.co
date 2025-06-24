
-- Ajouter les politiques manquantes pour offer_equipment
CREATE POLICY "users_can_delete_offer_equipment" ON offer_equipment
FOR DELETE USING (
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

CREATE POLICY "users_can_insert_offer_equipment" ON offer_equipment
FOR INSERT WITH CHECK (
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

-- Ajouter aussi les politiques pour offer_equipment_attributes et offer_equipment_specifications
CREATE POLICY "users_can_insert_offer_equipment_attributes" ON offer_equipment_attributes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM offer_equipment oe
    JOIN offers o ON o.id = oe.offer_id
    WHERE oe.id = offer_equipment_attributes.equipment_id 
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

CREATE POLICY "users_can_insert_offer_equipment_specifications" ON offer_equipment_specifications
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM offer_equipment oe
    JOIN offers o ON o.id = oe.offer_id
    WHERE oe.id = offer_equipment_specifications.equipment_id 
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
