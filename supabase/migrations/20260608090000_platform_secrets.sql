-- Secrets plateforme éditables depuis le SaaS admin (ex: clé API Mollie).
-- Stockés en DB pour être configurables par le super_admin sans redéploiement.
-- SÉCURITÉ : table accessible UNIQUEMENT au service_role (edge functions).
-- Le navigateur ne peut JAMAIS lire la valeur — RLS activée sans aucune policy,
-- et les GRANTs retirés pour anon/authenticated. La lecture/écriture passe
-- exclusivement par des edge functions (super_admin pour écrire).

CREATE TABLE IF NOT EXISTS public.platform_secrets (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_secrets ENABLE ROW LEVEL SECURITY;
-- Aucune policy => seul le service_role (qui bypasse la RLS) y accède.

REVOKE ALL ON public.platform_secrets FROM anon, authenticated;
