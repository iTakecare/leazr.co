-- Activer RLS sur la table company_enrichment_cache
ALTER TABLE public.company_enrichment_cache ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour la table
CREATE POLICY "company_enrichment_cache_secure_access" 
ON public.company_enrichment_cache 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_company_enrichment_cache_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_company_enrichment_cache_trigger
BEFORE UPDATE ON public.company_enrichment_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_company_enrichment_cache_updated_at();