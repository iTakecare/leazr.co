-- Corriger le signature_status du contrat spécifique
UPDATE contracts 
SET signature_status = 'signed' 
WHERE id = '5ecc2524-760a-4e16-9151-b5f80593dc0b';

-- Lier le leaser_id et corriger le leaser_name pour ce contrat
UPDATE contracts c
SET leaser_id = l.id,
    leaser_name = l.company_name
FROM leasers l
WHERE l.is_own_company = true
AND l.company_name IS NOT NULL
AND c.id = '5ecc2524-760a-4e16-9151-b5f80593dc0b';

-- Créer le bucket pour les contrats signés s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-contracts', 'signed-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de lecture publique
CREATE POLICY "Public can view signed contracts" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'signed-contracts');

-- Politique d'écriture pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload signed contracts" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'signed-contracts');

-- Politique de mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update signed contracts" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'signed-contracts');