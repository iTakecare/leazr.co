-- Créer la table pour les tokens personnalisés d'authentification
CREATE TABLE IF NOT EXISTS public.custom_auth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL, -- 'invitation', 'password_reset', 'activation'
  entity_type TEXT, -- 'partner', 'ambassador', 'client'
  entity_id UUID,
  company_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour performance
CREATE INDEX idx_custom_auth_tokens_token ON public.custom_auth_tokens(token);
CREATE INDEX idx_custom_auth_tokens_email ON public.custom_auth_tokens(email);
CREATE INDEX idx_custom_auth_tokens_expires ON public.custom_auth_tokens(expires_at);

-- RLS Policy
ALTER TABLE public.custom_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Politique pour accès admin seulement
CREATE POLICY "custom_auth_tokens_admin_access" 
ON public.custom_auth_tokens 
FOR ALL 
USING (is_admin_optimized());

-- Politique pour accès public en lecture des tokens valides (pour activation)
CREATE POLICY "custom_auth_tokens_public_read" 
ON public.custom_auth_tokens 
FOR SELECT 
USING (
  expires_at > now() 
  AND used_at IS NULL
);

-- Fonction de nettoyage des tokens expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_custom_auth_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.custom_auth_tokens 
  WHERE expires_at < now() OR used_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;