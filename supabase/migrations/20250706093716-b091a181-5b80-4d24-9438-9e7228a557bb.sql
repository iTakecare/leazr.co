-- Migrer les données existantes du modèle par défaut
DO $$
DECLARE
    template_record RECORD;
    image_record JSONB;
    image_counter INTEGER := 0;
BEGIN
    -- Récupérer le modèle par défaut avec ses images
    SELECT * INTO template_record FROM pdf_models WHERE id = 'default';
    
    IF FOUND AND template_record."templateImages" IS NOT NULL THEN
        -- Parcourir chaque image dans templateImages
        FOR image_record IN SELECT * FROM jsonb_array_elements(template_record."templateImages")
        LOOP
            -- Insérer chaque image dans la nouvelle table
            INSERT INTO pdf_model_images (
                model_id,
                image_id,
                name,
                data,
                page
            ) VALUES (
                'default',
                COALESCE(image_record->>'id', gen_random_uuid()::text),
                COALESCE(image_record->>'name', 'Page ' || image_counter),
                image_record->>'data',
                COALESCE((image_record->>'page')::integer, image_counter)
            );
            
            image_counter := image_counter + 1;
        END LOOP;
        
        -- Nettoyer le champ templateImages du modèle principal
        UPDATE pdf_models 
        SET "templateImages" = '[]'::jsonb 
        WHERE id = 'default';
        
        RAISE NOTICE 'Migration terminée: % images migrées', image_counter;
    END IF;
END $$;