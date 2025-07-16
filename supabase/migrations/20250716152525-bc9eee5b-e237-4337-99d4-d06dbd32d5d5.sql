-- Créer une fonction pour déclencher automatiquement la création Cloudflare
CREATE OR REPLACE FUNCTION public.trigger_cloudflare_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_name_var text;
BEGIN
  -- Récupérer le nom de l'entreprise
  SELECT name INTO company_name_var 
  FROM public.companies 
  WHERE id = NEW.company_id;
  
  -- Insérer un log pour déclencher la création Cloudflare via l'interface
  INSERT INTO public.cloudflare_subdomain_logs (
    company_id,
    subdomain,
    status,
    error_message,
    retry_count
  ) VALUES (
    NEW.company_id,
    NEW.subdomain,
    'pending',
    'Création automatique suite à insertion dans company_domains',
    0
  );
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger sur company_domains
DROP TRIGGER IF EXISTS trigger_auto_cloudflare_creation ON public.company_domains;
CREATE TRIGGER trigger_auto_cloudflare_creation
  AFTER INSERT ON public.company_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_cloudflare_creation();