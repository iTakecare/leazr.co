-- Fonction pour générer un sous-domaine unique à partir du nom de l'entreprise
CREATE OR REPLACE FUNCTION public.generate_company_subdomain(company_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_subdomain text;
  final_subdomain text;
  counter integer := 1;
BEGIN
  -- Nettoyer le nom de l'entreprise pour créer un sous-domaine valide
  base_subdomain := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Limiter à 20 caractères maximum
  base_subdomain := left(base_subdomain, 20);
  
  -- Si le nom est vide après nettoyage, utiliser un nom par défaut
  IF base_subdomain = '' OR base_subdomain IS NULL THEN
    base_subdomain := 'company';
  END IF;
  
  -- Vérifier l'unicité et ajouter un numéro si nécessaire
  final_subdomain := base_subdomain;
  
  WHILE EXISTS (SELECT 1 FROM public.company_domains WHERE subdomain = final_subdomain) LOOP
    final_subdomain := base_subdomain || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_subdomain;
END;
$$;