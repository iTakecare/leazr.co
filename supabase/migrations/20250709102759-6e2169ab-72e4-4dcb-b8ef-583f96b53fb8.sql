
-- =============================================
-- ISOLATION COMPLÈTE DES EMAIL TEMPLATES
-- =============================================

-- 1. Activer RLS sur email_templates (si pas déjà fait)
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques et créer une politique RLS stricte
DROP POLICY IF EXISTS "email_templates_strict_company_isolation" ON public.email_templates;
CREATE POLICY "email_templates_strict_company_isolation" 
ON public.email_templates 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR is_admin_optimized())
);

-- 3. Créer une fonction pour initialiser les templates d'email pour une nouvelle entreprise
CREATE OR REPLACE FUNCTION public.create_default_email_templates_for_company(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
  next_id integer;
BEGIN
  -- Ne pas créer de templates pour iTakecare (déjà configuré)
  IF p_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- Vérifier si les templates existent déjà
  IF EXISTS (SELECT 1 FROM public.email_templates WHERE company_id = p_company_id) THEN
    RETURN true;
  END IF;
  
  -- Récupérer le prochain ID disponible
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM public.email_templates;
  
  -- Créer les templates par défaut avec du contenu générique
  INSERT INTO public.email_templates (
    id, company_id, type, name, subject, html_content, text_content, active
  ) VALUES 
  (next_id, p_company_id, 'offer_ready', 'Offre prête', 
   'Votre offre {{client_name}} est prête', 
   '<p>Bonjour {{client_name}},</p><p>Votre offre est maintenant prête. Vous pouvez la consulter en cliquant sur le lien ci-dessous.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe</p>',
   'Bonjour {{client_name}}, Votre offre est maintenant prête.', true),
  
  (next_id + 1, p_company_id, 'document_request', 'Demande de documents', 
   'Documents requis pour {{client_name}}', 
   '<p>Bonjour {{client_name}},</p><p>Nous avons besoin de documents supplémentaires pour traiter votre dossier.</p><p>Vous pouvez les télécharger via ce lien : {{upload_link}}</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe</p>',
   'Bonjour {{client_name}}, Nous avons besoin de documents supplémentaires.', true),
   
  (next_id + 2, p_company_id, 'contract_ready', 'Contrat prêt', 
   'Votre contrat {{client_name}} est prêt', 
   '<p>Bonjour {{client_name}},</p><p>Votre contrat est maintenant prêt pour signature.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe</p>',
   'Bonjour {{client_name}}, Votre contrat est prêt pour signature.', true),
   
  (next_id + 3, p_company_id, 'welcome', 'Bienvenue', 
   'Bienvenue {{client_name}}', 
   '<p>Bonjour {{client_name}},</p><p>Bienvenue ! Nous sommes ravis de vous compter parmi nos clients.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe</p>',
   'Bonjour {{client_name}}, Bienvenue !', true);
  
  RETURN true;
END;
$$;

-- 4. Mettre à jour la fonction d'initialisation des entreprises
CREATE OR REPLACE FUNCTION public.initialize_new_company(p_company_id uuid, p_company_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  -- Ne pas initialiser iTakecare
  IF p_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- Créer des paramètres par défaut pour l'entreprise
  INSERT INTO public.company_customizations (
    company_id,
    company_name,
    primary_color,
    secondary_color,
    accent_color,
    created_at
  ) VALUES (
    p_company_id,
    p_company_name,
    '#3b82f6',
    '#64748b', 
    '#8b5cf6',
    now()
  ) ON CONFLICT (company_id) DO NOTHING;

  -- Créer des leasers par défaut pour cette entreprise
  PERFORM create_default_leasers_for_company(p_company_id);
  
  -- Créer des paramètres SMTP par défaut pour cette entreprise
  PERFORM create_default_smtp_settings_for_company(p_company_id);
  
  -- Créer des templates d'email par défaut pour cette entreprise
  PERFORM create_default_email_templates_for_company(p_company_id);

  RETURN true;
END;
$$;

-- 5. Créer des templates par défaut pour toutes les entreprises existantes (sauf iTakecare)
DO $$
DECLARE
  company_rec RECORD;
  next_id integer;
BEGIN
  -- Récupérer le prochain ID disponible
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM public.email_templates;
  
  -- Parcourir toutes les entreprises sauf iTakecare
  FOR company_rec IN 
    SELECT c.id, c.name
    FROM public.companies c
    WHERE c.id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid
      AND NOT EXISTS (
        SELECT 1 FROM public.email_templates et 
        WHERE et.company_id = c.id
      )
  LOOP
    -- Créer les templates pour cette entreprise
    INSERT INTO public.email_templates (
      id, company_id, type, name, subject, html_content, text_content, active
    ) VALUES 
    (next_id, company_rec.id, 'offer_ready', 'Offre prête', 
     'Votre offre {{client_name}} est prête', 
     '<p>Bonjour {{client_name}},</p><p>Votre offre est maintenant prête. Vous pouvez la consulter en cliquant sur le lien ci-dessous.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Votre offre est maintenant prête.', true),
    
    (next_id + 1, company_rec.id, 'document_request', 'Demande de documents', 
     'Documents requis pour {{client_name}}', 
     '<p>Bonjour {{client_name}},</p><p>Nous avons besoin de documents supplémentaires pour traiter votre dossier.</p><p>Vous pouvez les télécharger via ce lien : {{upload_link}}</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Nous avons besoin de documents supplémentaires.', true),
     
    (next_id + 2, company_rec.id, 'contract_ready', 'Contrat prêt', 
     'Votre contrat {{client_name}} est prêt', 
     '<p>Bonjour {{client_name}},</p><p>Votre contrat est maintenant prêt pour signature.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Votre contrat est prêt pour signature.', true),
     
    (next_id + 3, company_rec.id, 'welcome', 'Bienvenue', 
     'Bienvenue {{client_name}}', 
     '<p>Bonjour {{client_name}},</p><p>Bienvenue ! Nous sommes ravis de vous compter parmi nos clients.</p><p>{{site_logo}}</p><p>Cordialement,<br>L''équipe ' || company_rec.name || '</p>',
     'Bonjour {{client_name}}, Bienvenue !', true);
    
    next_id := next_id + 4;
  END LOOP;
END;
$$;

-- 6. Mettre à jour les templates existants d'iTakecare pour utiliser company_id
UPDATE public.email_templates 
SET company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid 
WHERE company_id IS NULL;
