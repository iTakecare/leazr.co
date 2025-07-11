-- Fonction trigger pour créer automatiquement un sous-domaine lors de la création d'une entreprise
CREATE OR REPLACE FUNCTION public.auto_create_company_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_subdomain text;
BEGIN
  -- Générer un sous-domaine unique
  generated_subdomain := public.generate_company_subdomain(NEW.name);
  
  -- Créer l'entrée dans company_domains
  INSERT INTO public.company_domains (
    company_id,
    domain,
    subdomain,
    is_active,
    is_primary
  ) VALUES (
    NEW.id,
    'leazr.co',
    generated_subdomain,
    true,
    true
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger qui se déclenche après l'insertion d'une nouvelle entreprise
CREATE OR REPLACE TRIGGER trigger_auto_create_company_domain
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_company_domain();