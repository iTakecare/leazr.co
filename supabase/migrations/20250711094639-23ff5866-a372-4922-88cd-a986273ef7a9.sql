-- Créer une table pour gérer les domaines personnalisés par entreprise
CREATE TABLE IF NOT EXISTS public.company_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  subdomain TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(domain),
  UNIQUE(company_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Activer RLS sur la table des domaines
ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les domaines d'entreprise
CREATE POLICY "company_domains_isolation" ON public.company_domains
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
) WITH CHECK (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Ajouter un trigger pour updated_at
CREATE OR REPLACE FUNCTION update_company_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_domains_updated_at
  BEFORE UPDATE ON public.company_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_company_domains_updated_at();

-- Table pour stocker les tokens d'activation personnalisés
CREATE TABLE IF NOT EXISTS public.custom_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('signup', 'password_reset', 'email_verification')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Index pour optimiser les recherches de tokens
CREATE INDEX IF NOT EXISTS idx_custom_auth_tokens_token ON public.custom_auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_custom_auth_tokens_email_type ON public.custom_auth_tokens(user_email, token_type);
CREATE INDEX IF NOT EXISTS idx_custom_auth_tokens_company ON public.custom_auth_tokens(company_id);

-- RLS pour les tokens d'authentification
ALTER TABLE public.custom_auth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_auth_tokens_isolation" ON public.custom_auth_tokens
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
) WITH CHECK (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Fonction pour nettoyer les tokens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.custom_auth_tokens 
  WHERE expires_at < now() OR used_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour détecter le company_id depuis l'URL ou le domaine
CREATE OR REPLACE FUNCTION detect_company_from_domain(request_origin TEXT)
RETURNS UUID AS $$
DECLARE
  company_uuid UUID;
  extracted_subdomain TEXT;
BEGIN
  -- Extraire le sous-domaine depuis l'origine de la requête
  -- Ex: https://client1.leazr.co -> client1
  IF request_origin LIKE '%.leazr.co%' THEN
    extracted_subdomain := SPLIT_PART(SPLIT_PART(request_origin, '//', 2), '.', 1);
    
    -- Chercher dans la table company_domains
    SELECT company_id INTO company_uuid
    FROM public.company_domains
    WHERE subdomain = extracted_subdomain AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Si pas trouvé, retourner NULL (utilisation du domaine principal)
  RETURN company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rendre les templates d'email avec des variables
CREATE OR REPLACE FUNCTION render_email_template(
  template_content TEXT,
  variables JSONB
)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  result := template_content;
  
  -- Remplacer chaque variable dans le template
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    result := REPLACE(result, '{{' || var_key || '}}', COALESCE(var_value, ''));
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;