
-- Créer les politiques RLS pour la table offer_equipment
ALTER TABLE offer_equipment ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux ambassadeurs de voir les équipements de leurs offres
CREATE POLICY "ambassadors_can_view_offer_equipment" ON offer_equipment
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_equipment.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      )
    )
  )
);

-- Politique pour permettre aux admins de voir tous les équipements
CREATE POLICY "admins_can_view_all_offer_equipment" ON offer_equipment
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Créer les politiques RLS pour la table offer_notes
ALTER TABLE offer_notes ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux ambassadeurs de voir les notes de leurs offres
CREATE POLICY "ambassadors_can_view_offer_notes" ON offer_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_notes.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      )
    )
  )
);

-- Politique pour permettre aux admins de voir toutes les notes
CREATE POLICY "admins_can_view_all_offer_notes" ON offer_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Créer les politiques RLS pour la table offer_workflow_logs
ALTER TABLE offer_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux ambassadeurs de voir les logs de leurs offres
CREATE POLICY "ambassadors_can_view_offer_workflow_logs" ON offer_workflow_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = offer_workflow_logs.offer_id 
    AND (
      o.user_id = auth.uid() 
      OR o.ambassador_id IN (
        SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
      )
    )
  )
);

-- Politique pour permettre aux admins de voir tous les logs
CREATE POLICY "admins_can_view_all_offer_workflow_logs" ON offer_workflow_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);
