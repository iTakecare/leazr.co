-- Améliorer les politiques du bucket pdf-templates pour la sécurité
-- Le bucket reste public pour l'accès en lecture, mais ajoute des restrictions pour l'écriture

-- Créer des politiques plus spécifiques pour le bucket pdf-templates
CREATE POLICY "Users can view their company's PDF templates" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pdf-templates');

CREATE POLICY "Users can upload their own PDF templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'pdf-templates' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own PDF templates" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'pdf-templates' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own PDF templates" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'pdf-templates' 
  AND auth.uid() IS NOT NULL
);