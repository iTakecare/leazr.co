-- Migration pour ajouter l'isolation multi-tenant aux templates PDF
-- Phase 1: Ajouter la colonne company_id à pdf_models

-- Ajouter la colonne company_id (nullable temporairement pour la migration)
ALTER TABLE public.pdf_models 
ADD COLUMN company_id UUID;

-- Créer une contrainte de clé étrangère vers companies
ALTER TABLE public.pdf_models 
ADD CONSTRAINT pdf_models_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Phase 2: Migration des données existantes
-- Identifier l'entreprise iTakecare
DO $$
DECLARE
  itakecare_company_id UUID := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
  default_model_exists BOOLEAN;
BEGIN
  -- Vérifier si un modèle par défaut existe
  SELECT EXISTS(SELECT 1 FROM public.pdf_models WHERE id = 'default') INTO default_model_exists;
  
  -- Si un modèle par défaut existe sans company_id, l'assigner à iTakecare
  IF default_model_exists THEN
    UPDATE public.pdf_models 
    SET company_id = itakecare_company_id 
    WHERE id = 'default' AND company_id IS NULL;
  END IF;
  
  -- Pour toutes les autres entreprises actives, créer des templates par défaut
  INSERT INTO public.pdf_models (
    id,
    name,
    "companyName",
    "companyAddress", 
    "companyContact",
    "companySiret",
    "logoURL",
    "primaryColor",
    "secondaryColor",
    "headerText",
    "footerText",
    "templateImages",
    fields,
    company_id,
    created_at,
    updated_at
  )
  SELECT 
    'default-' || c.id::text,
    'Modèle par défaut',
    COALESCE(cc.company_name, c.name, 'Votre Entreprise'),
    COALESCE(cc.company_address, 'Adresse à renseigner'),
    COALESCE(cc.company_email, 'contact@votre-entreprise.com'),
    'SIRET à renseigner',
    COALESCE(cc.logo_url, ''),
    COALESCE(cc.primary_color, c.primary_color, '#3b82f6'),
    COALESCE(cc.secondary_color, c.secondary_color, '#64748b'),
    'Offre de Leasing',
    'Merci de votre confiance',
    '[]'::jsonb,
    '[]'::jsonb,
    c.id,
    NOW(),
    NOW()
  FROM public.companies c
  LEFT JOIN public.company_customizations cc ON cc.company_id = c.id
  WHERE c.id != itakecare_company_id
    AND c.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.pdf_models pm 
      WHERE pm.company_id = c.id
    );
END $$;

-- Phase 3: Rendre company_id obligatoire maintenant que toutes les données sont migrées
ALTER TABLE public.pdf_models 
ALTER COLUMN company_id SET NOT NULL;

-- Phase 4: Mettre à jour les politiques RLS pour l'isolation par entreprise
DROP POLICY IF EXISTS "Admin manage pdf_models" ON public.pdf_models;

-- Politique pour l'accès par entreprise
CREATE POLICY "pdf_models_company_isolation" 
ON public.pdf_models 
FOR ALL 
USING (
  (company_id = get_user_company_id()) OR is_admin_optimized()
)
WITH CHECK (
  (company_id = get_user_company_id()) OR is_admin_optimized()
);

-- Phase 5: Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_pdf_models_company_id 
ON public.pdf_models(company_id);

-- Log de confirmation
DO $$
DECLARE
  total_models INTEGER;
  companies_with_models INTEGER;
BEGIN
  SELECT COUNT(*) FROM public.pdf_models INTO total_models;
  SELECT COUNT(DISTINCT company_id) FROM public.pdf_models INTO companies_with_models;
  
  RAISE NOTICE 'Migration terminée: % modèles PDF répartis sur % entreprises', 
    total_models, companies_with_models;
END $$;