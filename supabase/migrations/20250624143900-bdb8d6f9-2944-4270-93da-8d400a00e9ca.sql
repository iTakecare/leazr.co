
-- D'abord, supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "users_can_view_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "users_can_insert_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "users_can_update_offer_equipment" ON offer_equipment;
DROP POLICY IF EXISTS "users_can_delete_offer_equipment" ON offer_equipment;

DROP POLICY IF EXISTS "users_can_view_offer_equipment_attributes" ON offer_equipment_attributes;
DROP POLICY IF EXISTS "users_can_insert_offer_equipment_attributes" ON offer_equipment_attributes;

DROP POLICY IF EXISTS "users_can_view_offer_equipment_specifications" ON offer_equipment_specifications;
DROP POLICY IF EXISTS "users_can_insert_offer_equipment_specifications" ON offer_equipment_specifications;

DROP POLICY IF EXISTS "users_can_view_offer_notes" ON offer_notes;
DROP POLICY IF EXISTS "users_can_insert_offer_notes" ON offer_notes;

DROP POLICY IF EXISTS "users_can_view_offer_workflow_logs" ON offer_workflow_logs;
DROP POLICY IF EXISTS "users_can_insert_offer_workflow_logs" ON offer_workflow_logs;

DROP POLICY IF EXISTS "users_can_view_profile_names" ON profiles;

-- Activer RLS sur les tables si ce n'est pas déjà fait
ALTER TABLE offer_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_equipment_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_equipment_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Créer les nouvelles politiques RLS pour offer_equipment
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

CREATE POLICY "users_can_update_offer_equipment" ON offer_equipment
FOR UPDATE USING (
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

-- Créer les politiques RLS pour offer_equipment_attributes
CREATE POLICY "users_can_view_offer_equipment_attributes" ON offer_equipment_attributes
FOR SELECT USING (
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

-- Créer les politiques RLS pour offer_equipment_specifications
CREATE POLICY "users_can_view_offer_equipment_specifications" ON offer_equipment_specifications
FOR SELECT USING (
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

-- Créer les politiques RLS pour offer_notes
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

-- Créer les politiques RLS pour offer_workflow_logs
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

-- Créer une politique pour permettre la lecture des profils lors des JOINs
CREATE POLICY "users_can_view_profile_names" ON profiles
FOR SELECT USING (
  -- Permettre la lecture des noms/prénoms pour les JOINs avec les tables d'offres
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin', 'ambassador')
  )
);
