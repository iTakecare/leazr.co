-- Correctif : la création de toute nouvelle company échouait en production.
--
-- Cause racine : la migration 20250712083042 voulait remplacer le trigger de création
-- de domaine, mais son DROP visait le mauvais nom (`auto_create_company_domain` au lieu
-- de `trigger_auto_create_company_domain` créé par 20250711112951). Les deux triggers
-- AFTER INSERT coexistaient donc et inséraient chacun un domaine primaire
-- → violation de la contrainte unique (company_id, is_primary) sur company_domains
-- → l'INSERT dans companies échouait (23505), toute création de tenant était bloquée.

-- 1) Supprimer l'ancien trigger (vrai nom) et sa fonction
DROP TRIGGER IF EXISTS trigger_auto_create_company_domain ON public.companies;
DROP TRIGGER IF EXISTS auto_create_company_domain ON public.companies;
DROP FUNCTION IF EXISTS public.auto_create_company_domain();

-- 2) Durcir le trigger restant : idempotent, ne crée rien si la company a déjà un domaine
CREATE OR REPLACE FUNCTION public.auto_create_cloudflare_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_subdomain text;
BEGIN
  -- Déjà un domaine pour cette company (création manuelle, re-jeu, etc.) : ne rien faire
  IF EXISTS (SELECT 1 FROM public.company_domains WHERE company_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  generated_subdomain := public.generate_company_subdomain(NEW.name);

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
    false, -- activé après création Cloudflare
    true
  )
  ON CONFLICT (company_id, subdomain) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 3) Codifier les contraintes uniques attendues par les triggers d'initialisation
-- (posées manuellement en prod le 28/07/2026, reprises ici pour les nouveaux environnements)
CREATE UNIQUE INDEX IF NOT EXISTS company_domains_company_id_subdomain_key
  ON public.company_domains (company_id, subdomain);
CREATE UNIQUE INDEX IF NOT EXISTS company_customizations_company_id_key
  ON public.company_customizations (company_id);
