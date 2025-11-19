-- Rendre le bucket site-settings public pour afficher les logos de la plateforme
UPDATE storage.buckets 
SET public = true 
WHERE id = 'site-settings';