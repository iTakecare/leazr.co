
-- Vérifier d'abord s'il y a des données orphelines avant d'ajouter les contraintes
-- Nettoyer les données orphelines dans offer_notes si nécessaire
DELETE FROM offer_notes 
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM profiles);

-- Nettoyer les données orphelines dans offer_workflow_logs si nécessaire
DELETE FROM offer_workflow_logs 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM profiles);

-- Ajouter la contrainte de clé étrangère pour offer_notes.created_by -> profiles.id
ALTER TABLE offer_notes 
ADD CONSTRAINT fk_offer_notes_created_by 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Ajouter la contrainte de clé étrangère pour offer_workflow_logs.user_id -> profiles.id
ALTER TABLE offer_workflow_logs 
ADD CONSTRAINT fk_offer_workflow_logs_user_id 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;
