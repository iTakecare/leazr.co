-- Modifier le trigger existant pour créer automatiquement un sous-domaine Cloudflare
CREATE OR REPLACE FUNCTION public.auto_create_cloudflare_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_subdomain text;
BEGIN
  -- Générer un sous-domaine unique
  generated_subdomain := public.generate_company_subdomain(NEW.name);
  
  -- Créer l'entrée dans company_domains (sera mise à jour par l'edge function)
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
    false, -- Sera activé après création Cloudflare
    true
  )
  ON CONFLICT (company_id, subdomain) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Remplacer le trigger existant
DROP TRIGGER IF EXISTS auto_create_company_domain ON public.companies;
CREATE TRIGGER auto_create_cloudflare_domain
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_cloudflare_domain();

-- Ajouter une table pour tracer les créations de sous-domaines
CREATE TABLE IF NOT EXISTS public.cloudflare_subdomain_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  subdomain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  cloudflare_record_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS pour les logs
ALTER TABLE public.cloudflare_subdomain_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cloudflare_logs_company_access" ON public.cloudflare_subdomain_logs
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_cloudflare_logs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_cloudflare_logs_updated_at
  BEFORE UPDATE ON public.cloudflare_subdomain_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cloudflare_logs_updated_at();