-- Ajouter les fonctions et triggers de validation pour empêcher les futures assignations incorrectes

-- 1. Créer une fonction pour assurer l'isolation lors de la création de profil
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
      -- Si une assignation incorrecte est tentée, empêcher et créer une nouvelle entreprise
      RAISE NOTICE 'Assignation incorrecte à iTakecare empêchée pour %', user_email;
      NEW.company_id := NULL; -- Sera géré par la logique applicative
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger pour assurer l'isolation automatique
DROP TRIGGER IF EXISTS ensure_company_isolation ON public.profiles;
CREATE TRIGGER ensure_company_isolation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_proper_company_assignment();

-- 3. Ajouter une fonction de validation plus stricte
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
    RAISE EXCEPTION 'Assignation non autorisée: Utilisateur % ne peut pas être assigné à l''entreprise iTakecare', user_email;
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

-- 4. Améliorer les politiques RLS pour une meilleure isolation
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