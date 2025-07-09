
-- Migration pour initialiser les templates d'email manquants pour les entreprises existantes
-- Crée des templates génériques pour toutes les entreprises qui n'en ont pas

DO $$
DECLARE
  company_rec RECORD;
  next_id integer;
BEGIN
  -- Récupérer le prochain ID disponible
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM public.email_templates;
  
  -- Parcourir toutes les entreprises qui n'ont pas de templates
  FOR company_rec IN 
    SELECT c.id, c.name
    FROM public.companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.email_templates et 
      WHERE et.company_id = c.id
    )
  LOOP
    RAISE NOTICE 'Création des templates pour l''entreprise: % (ID: %)', company_rec.name, company_rec.id;
    
    -- Créer les templates par défaut pour cette entreprise
    INSERT INTO public.email_templates (
      id, company_id, type, name, subject, html_content, text_content, active
    ) VALUES 
    (next_id, company_rec.id, 'offer_ready', 'Offre prête', 
     'Votre offre est prête - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Nous avons le plaisir de vous informer que votre offre est maintenant prête.</p><p>Vous pouvez la consulter et la valider en cliquant sur le lien ci-dessous.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Votre offre est maintenant prête.', true),
    
    (next_id + 1, company_rec.id, 'document_request', 'Demande de documents', 
     'Documents requis - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Pour finaliser votre dossier, nous avons besoin de documents supplémentaires.</p><p>Vous pouvez les télécharger facilement via ce lien : {{upload_link}}</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Nous avons besoin de documents supplémentaires.', true),
     
    (next_id + 2, company_rec.id, 'contract_ready', 'Contrat prêt', 
     'Votre contrat est prêt - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Excellente nouvelle ! Votre contrat est maintenant prêt pour signature.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Votre contrat est prêt pour signature.', true),
     
    (next_id + 3, company_rec.id, 'welcome', 'Bienvenue', 
     'Bienvenue chez ' || company_rec.name || ' - {{client_name}}', 
     '<h2>Bonjour {{client_name}},</h2><p>Bienvenue chez ' || company_rec.name || ' !</p><p>Nous sommes ravis de vous compter parmi nos clients et nous vous accompagnerons tout au long de votre parcours.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Bienvenue chez ' || company_rec.name || ' !', true);
    
    next_id := next_id + 4;
  END LOOP;
  
  RAISE NOTICE 'Migration terminée - Templates créés pour toutes les entreprises sans templates';
END;
$$;
