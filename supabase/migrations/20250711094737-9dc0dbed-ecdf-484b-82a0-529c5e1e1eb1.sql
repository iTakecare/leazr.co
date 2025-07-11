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

-- Ajouter de nouveaux types de templates d'email pour l'authentification personnalisée
-- On utilise des valeurs d'ID spécifiques pour éviter les conflits
INSERT INTO public.email_templates (company_id, name, type, subject, html_content, active) 
SELECT 
  c.id as company_id,
  'Bienvenue - Activation de compte' as name,
  'signup_welcome' as type,
  'Bienvenue chez {{company_name}} - Activez votre compte' as subject,
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: {{primary_color}};">{{company_name}}</h1>
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
  </div>' as html_content,
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
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: {{primary_color}};">{{company_name}}</h1>
    </div>
    <h2 style="color: {{primary_color}}; text-align: center;">Vérifiez votre adresse email</h2>
    <p>Bonjour {{user_name}},</p>
    <p>Pour continuer avec {{company_name}}, nous devons vérifier votre adresse email.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verification_link}}" style="background-color: {{primary_color}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Vérifier mon email
      </a>
    </div>
  </div>' as html_content,
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
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: {{primary_color}};">{{company_name}}</h1>
    </div>
    <h2 style="color: {{primary_color}}; text-align: center;">🎉 Compte activé !</h2>
    <p>Félicitations {{user_name}} !</p>
    <p>Votre compte chez <strong>{{company_name}}</strong> est maintenant actif et prêt à être utilisé.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_url}}" style="background-color: {{primary_color}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Accéder à mon compte
      </a>
    </div>
  </div>' as html_content,
  true as active
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.company_id = c.id AND et.type = 'account_activated'
);