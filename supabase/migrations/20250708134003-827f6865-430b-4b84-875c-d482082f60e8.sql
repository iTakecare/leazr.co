-- Corriger la fonction get_current_user_email() pour gérer les cas où auth.uid() est null
-- Cela évite l'erreur "function get_current_user_email() does not exist" lors de la création d'utilisateur

CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
  current_user_id UUID;
BEGIN
  -- Récupérer l'ID utilisateur actuel
  current_user_id := auth.uid();
  
  -- Si pas d'utilisateur authentifié, retourner null
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Récupérer l'email de l'utilisateur
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  RETURN user_email;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner null au lieu de faire échouer
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Mettre à jour la politique RLS pour gérer le cas où get_current_user_email() retourne null
DROP POLICY IF EXISTS "Company strict isolation" ON public.companies;
CREATE POLICY "Company strict isolation" 
ON public.companies 
FOR ALL 
USING (
  id = get_user_company_id() 
  OR is_admin_optimized()
  OR (
    -- Permettre aux utilisateurs iTakecare de voir leur entreprise (seulement si authentifiés)
    get_current_user_email() IS NOT NULL
    AND get_current_user_email() LIKE '%itakecare.be%'
    AND companies.name = 'iTakecare'
  )
);