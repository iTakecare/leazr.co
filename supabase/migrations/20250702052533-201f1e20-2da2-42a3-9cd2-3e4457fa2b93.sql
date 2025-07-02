-- Ajouter une politique RLS pour permettre aux admins de supprimer les logs de contrats
CREATE POLICY "Admins can delete contract workflow logs" 
ON contract_workflow_logs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Modifier la contrainte de clé étrangère pour permettre la suppression en cascade
ALTER TABLE contract_workflow_logs 
DROP CONSTRAINT IF EXISTS contract_workflow_logs_contract_id_fkey;

ALTER TABLE contract_workflow_logs 
ADD CONSTRAINT contract_workflow_logs_contract_id_fkey 
FOREIGN KEY (contract_id) 
REFERENCES contracts(id) 
ON DELETE CASCADE;