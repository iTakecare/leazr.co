-- Migration pour corriger la contrainte unique des templates d'email
-- La contrainte actuelle (type, active) doit inclure company_id pour permettre l'isolation multi-tenant

-- 1. Supprimer l'ancienne contrainte unique
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_type_active_key;

-- 2. Ajouter la nouvelle contrainte unique avec company_id
ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_company_type_active_key 
UNIQUE (company_id, type, active);

-- 3. Maintenant créer les templates pour ALizz SRL
DO $$
DECLARE
  alizz_company_id uuid := 'b501f123-2c3f-4855-81d1-ceb32afb9ff0';
  next_id integer;
BEGIN
  -- Vérifier si ALizz SRL existe et n'a pas de templates
  IF EXISTS (SELECT 1 FROM public.companies WHERE id = alizz_company_id) 
     AND NOT EXISTS (SELECT 1 FROM public.email_templates WHERE company_id = alizz_company_id) THEN
    
    -- Récupérer le prochain ID disponible
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM public.email_templates;
    
    RAISE NOTICE 'Création des templates d''email pour ALizz SRL (ID: %)', alizz_company_id;
    
    -- Créer les templates spécifiques pour ALizz SRL
    INSERT INTO public.email_templates (
      id, company_id, type, name, subject, html_content, text_content, active
    ) VALUES 
    (next_id, alizz_company_id, 'offer_ready', 'Offre prête', 
     'Votre offre est prête - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Nous avons le plaisir de vous informer que votre offre est maintenant prête.</p><p>Vous pouvez la consulter et la valider en cliquant sur le lien ci-dessous.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ALizz SRL</p>',
     'Bonjour {{client_name}}, Votre offre est maintenant prête.', true),
    
    (next_id + 1, alizz_company_id, 'document_request', 'Demande de documents', 
     'Documents requis - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Pour finaliser votre dossier, nous avons besoin de documents supplémentaires.</p><p>Vous pouvez les télécharger facilement via ce lien : {{upload_link}}</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ALizz SRL</p>',
     'Bonjour {{client_name}}, Nous avons besoin de documents supplémentaires.', true),
     
    (next_id + 2, alizz_company_id, 'contract_ready', 'Contrat prêt', 
     'Votre contrat est prêt - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Excellente nouvelle ! Votre contrat est maintenant prêt pour signature.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ALizz SRL</p>',
     'Bonjour {{client_name}}, Votre contrat est prêt pour signature.', true),
     
    (next_id + 3, alizz_company_id, 'welcome', 'Bienvenue', 
     'Bienvenue chez ALizz SRL - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Bienvenue chez ALizz SRL !</p><p>Nous sommes ravis de vous compter parmi nos clients et nous vous accompagnerons tout au long de votre parcours.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ALizz SRL</p>',
     'Bonjour {{client_name}}, Bienvenue chez ALizz SRL !', true);
    
    RAISE NOTICE 'Templates d''email créés avec succès pour ALizz SRL - IDs: % à %', next_id, next_id + 3;
  ELSE
    RAISE NOTICE 'ALizz SRL introuvable ou a déjà des templates d''email';
  END IF;
END;
$$;