-- Créer une fonction sécurisée pour récupérer le company_id de l'utilisateur actuel
CREATE OR REPLACE FUNCTION public.get_current_user_company_id_secure()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Récupérer le company_id depuis la table profiles
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner NULL
    RETURN NULL;
END;
$$;

-- Simplifier les politiques RLS pour pdf_templates en utilisant uniquement get_user_company_id()
DROP POLICY IF EXISTS "pdf_templates_complete_isolation" ON public.pdf_templates;

CREATE POLICY "pdf_templates_secure_access" 
ON public.pdf_templates 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR is_admin_optimized())
);