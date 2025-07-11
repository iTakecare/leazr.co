-- Ajouter de nouveaux types de templates d'email pour l'authentification personnalisée
INSERT INTO public.email_templates (company_id, name, type, subject, html_content, active) 
SELECT 
  c.id as company_id,
  'Bienvenue - Activation de compte' as name,
  'signup_welcome' as type,
  'Bienvenue chez {{company_name}} - Activez votre compte' as subject,
  '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        {{#if company_logo}}
        <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 60px;">
        {{else}}
        <h1 style="color: {{primary_color}};">{{company_name}}</h1>
        {{/if}}
      </div>
      
      <h2 style="color: {{primary_color}}; text-align: center;">Bienvenue {{user_name}} !</h2>
      
      <p>Merci de vous être inscrit chez <strong>{{company_name}}</strong>.</p>
      
      <p>Pour finaliser votre inscription et accéder à votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{activation_link}}" style="background-color: {{primary_color}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Activer mon compte
        </a>
      </div>
      
      <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :</p>
      <p style="word-break: break-all; font-size: 12px; color: #666;">{{activation_link}}</p>
      
      <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        Si vous n''avez pas créé de compte chez {{company_name}}, vous pouvez ignorer cet email.
      </p>
      
      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
        Cet email a été envoyé par {{company_name}}<br>
        {{#if company_address}}{{company_address}}{{/if}}
      </div>
    </div>
  ' as html_content,
  true as active
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.company_id = c.id AND et.type = 'signup_welcome'
);

-- Template pour vérification d'email
INSERT INTO public.email_templates (company_id, name, type, subject, html_content, active)
SELECT 
  c.id as company_id,
  'Vérification d''email' as name,
  'email_verification' as type,
  'Vérifiez votre adresse email - {{company_name}}' as subject,
  '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        {{#if company_logo}}
        <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 60px;">
        {{else}}
        <h1 style="color: {{primary_color}};">{{company_name}}</h1>
        {{/if}}
      </div>
      
      <h2 style="color: {{primary_color}}; text-align: center;">Vérifiez votre adresse email</h2>
      
      <p>Bonjour {{user_name}},</p>
      
      <p>Pour continuer avec {{company_name}}, nous devons vérifier votre adresse email.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verification_link}}" style="background-color: {{primary_color}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Vérifier mon email
        </a>
      </div>
      
      <p>Si le bouton ne fonctionne pas, copiez ce lien :</p>
      <p style="word-break: break-all; font-size: 12px; color: #666;">{{verification_link}}</p>
      
      <p style="margin-top: 40px; font-size: 12px; color: #666;">
        Ce lien expire dans 24 heures pour des raisons de sécurité.
      </p>
    </div>
  ' as html_content,
  true as active
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.company_id = c.id AND et.type = 'email_verification'
);

-- Template pour compte activé
INSERT INTO public.email_templates (company_id, name, type, subject, html_content, active)
SELECT 
  c.id as company_id,
  'Compte activé avec succès' as name,
  'account_activated' as type,
  'Votre compte {{company_name}} est maintenant actif !' as subject,
  '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        {{#if company_logo}}
        <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 60px;">
        {{else}}
        <h1 style="color: {{primary_color}};">{{company_name}}</h1>
        {{/if}}
      </div>
      
      <h2 style="color: {{primary_color}}; text-align: center;">🎉 Compte activé !</h2>
      
      <p>Félicitations {{user_name}} !</p>
      
      <p>Votre compte chez <strong>{{company_name}}</strong> est maintenant actif et prêt à être utilisé.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{login_url}}" style="background-color: {{primary_color}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Accéder à mon compte
        </a>
      </div>
      
      <p>Vous pouvez maintenant profiter de tous nos services :</p>
      <ul style="margin: 20px 0; padding-left: 20px;">
        <li>Gestion de vos demandes</li>
        <li>Suivi de vos dossiers</li>
        <li>Support client personnalisé</li>
      </ul>
      
      <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
        Besoin d''aide ? Notre équipe support est là pour vous accompagner.
      </p>
    </div>
  ' as html_content,
  true as active
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.company_id = c.id AND et.type = 'account_activated'
);

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

-- Insérer des domaines par défaut pour les entreprises existantes
INSERT INTO public.company_domains (company_id, domain, subdomain, is_primary, is_active)
SELECT 
  id as company_id,
  'leazr.co' as domain,
  LOWER(REPLACE(name, ' ', '')) as subdomain,
  true as is_primary,
  true as is_active
FROM public.companies
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_domains cd WHERE cd.company_id = companies.id
);

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