-- Ajouter les colonnes manquantes à la table collaborators si elles n'existent pas
DO $$
BEGIN
  -- Ajouter la colonne role si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'collaborators' AND column_name = 'role') THEN
    ALTER TABLE public.collaborators ADD COLUMN role text DEFAULT 'Collaborateur';
  END IF;

  -- Ajouter la colonne is_primary si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'collaborators' AND column_name = 'is_primary') THEN
    ALTER TABLE public.collaborators ADD COLUMN is_primary boolean DEFAULT false;
  END IF;
END $$;