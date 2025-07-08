-- Corriger l'erreur "Database error saving new user"
-- Le problème : le trigger handle_new_user() essaie d'insérer company_id = NULL 
-- mais la colonne est NOT NULL

-- 1. Rendre la colonne company_id nullable pour permettre la création en deux étapes
ALTER TABLE public.profiles 
ALTER COLUMN company_id DROP NOT NULL;

-- 2. Mettre à jour le trigger pour explicitement définir company_id à NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer le profil utilisateur avec les métadonnées de base
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULL -- Explicitement défini à NULL, sera mis à jour après création de l'entreprise
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vérifier que le trigger existe toujours
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();