-- Correction de l'isolation des données entre entreprises
-- Cette migration corrige les problèmes d'assignation incorrecte des utilisateurs

-- 1. Identifier et corriger les utilisateurs mal assignés (non-iTakecare assignés à iTakecare)
UPDATE public.profiles 
SET company_id = NULL
WHERE company_id IN (
  SELECT id FROM public.companies WHERE name = 'iTakecare'
) 
AND id IN (
  SELECT u.id FROM auth.users u 
  WHERE u.email NOT LIKE '%itakecare.be%'
);

-- 2. Créer une fonction pour assurer l'isolation lors de la création de profil
CREATE OR REPLACE FUNCTION public.ensure_proper_company_assignment()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  itakecare_company_id UUID;
BEGIN
  -- Récupérer l'email de l'utilisateur
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  
  -- Si c'est un utilisateur iTakecare
  IF user_email LIKE '%itakecare.be%' THEN
    -- Récupérer l'ID de l'entreprise iTakecare
    SELECT id INTO itakecare_company_id FROM public.companies WHERE name = 'iTakecare' LIMIT 1;
    
    -- Si l'entreprise iTakecare existe, l'assigner
    IF itakecare_company_id IS NOT NULL THEN
      NEW.company_id := itakecare_company_id;
    END IF;
  ELSE
    -- Pour les autres utilisateurs, s'assurer qu'ils ne sont PAS assignés à iTakecare
    SELECT id INTO itakecare_company_id FROM public.companies WHERE name = 'iTakecare' LIMIT 1;
    
    IF NEW.company_id = itakecare_company_id THEN
      NEW.company_id := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le trigger pour assurer l'isolation automatique
DROP TRIGGER IF EXISTS ensure_company_isolation ON public.profiles;
CREATE TRIGGER ensure_company_isolation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_proper_company_assignment();

-- 4. Nettoyer les données orphelines dans les tables liées
-- Supprimer les clients qui ne correspondent à aucune entreprise valide
DELETE FROM public.clients 
WHERE company_id NOT IN (SELECT id FROM public.companies)
OR company_id IS NULL;

-- 5. Améliorer les politiques RLS pour une meilleure isolation
-- Renforcer la politique sur les entreprises
DROP POLICY IF EXISTS "Company strict isolation" ON public.companies;
CREATE POLICY "Company strict isolation" 
ON public.companies 
FOR ALL 
USING (
  id = get_user_company_id() 
  OR is_admin_optimized()
  OR (
    -- Permettre aux utilisateurs iTakecare de voir leur entreprise
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%itakecare.be%'
      AND companies.name = 'iTakecare'
    )
  )
);

-- 6. Ajouter une contrainte pour empêcher l'assignation incorrecte
CREATE OR REPLACE FUNCTION public.validate_company_assignment()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  company_name TEXT;
BEGIN
  -- Récupérer l'email de l'utilisateur et le nom de l'entreprise
  SELECT u.email, c.name 
  INTO user_email, company_name
  FROM auth.users u, public.companies c
  WHERE u.id = NEW.id AND c.id = NEW.company_id;
  
  -- Vérifier que les utilisateurs non-iTakecare ne sont pas assignés à iTakecare
  IF company_name = 'iTakecare' AND NOT (user_email LIKE '%itakecare.be%') THEN
    RAISE EXCEPTION 'Utilisateur non-iTakecare ne peut pas être assigné à l''entreprise iTakecare';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer cette validation
DROP TRIGGER IF EXISTS validate_company_assignment_trigger ON public.profiles;
CREATE TRIGGER validate_company_assignment_trigger
  BEFORE INSERT OR UPDATE OF company_id ON public.profiles
  FOR EACH ROW
  WHEN (NEW.company_id IS NOT NULL)
  EXECUTE FUNCTION public.validate_company_assignment();