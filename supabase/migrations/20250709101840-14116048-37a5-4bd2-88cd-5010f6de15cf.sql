
-- =============================================
-- ISOLATION DES PARAMÈTRES EMAIL RESEND
-- =============================================

-- 1. Ajouter la colonne company_id à smtp_settings
ALTER TABLE public.smtp_settings 
ADD COLUMN IF NOT EXISTS company_id uuid;

-- 2. Activer RLS sur smtp_settings
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- 3. Créer des politiques RLS strictes pour smtp_settings
DROP POLICY IF EXISTS "smtp_settings_company_isolation" ON public.smtp_settings;
CREATE POLICY "smtp_settings_company_isolation" 
ON public.smtp_settings 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR is_admin_optimized())
);

-- 4. Mettre à jour l'enregistrement existant avec l'ID d'iTakecare
UPDATE public.smtp_settings 
SET company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid 
WHERE id = 1 AND company_id IS NULL;

-- 5. Créer une fonction pour initialiser les paramètres SMTP pour une nouvelle entreprise
CREATE OR REPLACE FUNCTION public.create_default_smtp_settings_for_company(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  -- Ne pas créer de paramètres pour iTakecare (déjà configuré)
  IF p_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- Vérifier si les paramètres existent déjà
  IF EXISTS (SELECT 1 FROM public.smtp_settings WHERE company_id = p_company_id) THEN
    RETURN true;
  END IF;
  
  -- Créer des paramètres SMTP vides pour la nouvelle entreprise
  INSERT INTO public.smtp_settings (
    company_id,
    from_email,
    from_name,
    use_resend,
    resend_api_key
  ) VALUES (
    p_company_id,
    '',
    'Votre Entreprise',
    true,
    ''
  );
  
  RETURN true;
END;
$$;

-- 6. Mettre à jour la fonction d'initialisation des entreprises
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

  RETURN true;
END;
$$;

-- 7. Créer des paramètres SMTP vides pour toutes les entreprises existantes (sauf iTakecare)
INSERT INTO public.smtp_settings (company_id, from_email, from_name, use_resend, resend_api_key)
SELECT 
  c.id,
  '',
  c.name,
  true,
  ''
FROM public.companies c
WHERE c.id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.smtp_settings s 
    WHERE s.company_id = c.id
  );
