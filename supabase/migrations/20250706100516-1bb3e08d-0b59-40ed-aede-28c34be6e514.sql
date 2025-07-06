-- Nettoyer les images dupliquées en plusieurs étapes
-- Étape 1: Créer une table temporaire avec les images uniques
CREATE TEMP TABLE temp_unique_images AS (
  SELECT DISTINCT ON (model_id, page) 
    id, model_id, image_id, name, data, page, created_at
  FROM pdf_model_images 
  ORDER BY model_id, page, created_at DESC
);

-- Étape 2: Supprimer toutes les images existantes
DELETE FROM pdf_model_images;

-- Étape 3: Réinsérer seulement les images uniques
INSERT INTO pdf_model_images (id, model_id, image_id, name, data, page, created_at)
SELECT id, model_id, image_id, name, data, page, created_at
FROM temp_unique_images;

-- Étape 4: Ajouter une contrainte unique pour éviter les doublons futurs
ALTER TABLE pdf_model_images 
ADD CONSTRAINT unique_model_page UNIQUE (model_id, page);