-- Nettoyer les images dupliquées et ajouter une contrainte unique
-- D'abord, créer une table temporaire avec les images uniques (plus récentes par page)
WITH unique_images AS (
  SELECT DISTINCT ON (model_id, page) 
    id, model_id, image_id, name, data, page, created_at
  FROM pdf_model_images 
  ORDER BY model_id, page, created_at DESC
)
-- Supprimer toutes les images
DELETE FROM pdf_model_images;

-- Réinsérer seulement les images uniques
INSERT INTO pdf_model_images (id, model_id, image_id, name, data, page, created_at)
SELECT id, model_id, image_id, name, data, page, created_at
FROM unique_images;

-- Ajouter une contrainte unique pour éviter les doublons futurs
ALTER TABLE pdf_model_images 
ADD CONSTRAINT unique_model_page UNIQUE (model_id, page);