BEGIN;

-- =========================================================
-- Phase 1 KYC : champs société + table d'historique des analyses
-- =========================================================

-- 1. Champs KYC sur la table clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS company_creation_date date,
  ADD COLUMN IF NOT EXISTS legal_form text,
  ADD COLUMN IF NOT EXISTS kyc_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS young_company_relaunched_at timestamptz;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_entity_type_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_entity_type_check
  CHECK (
    entity_type IS NULL
    OR entity_type IN ('societe', 'independant', 'asbl', 'autre')
  );

COMMENT ON COLUMN public.clients.entity_type IS
  'Type juridique du client (societe, independant, asbl, autre). Pilote l''affichage et l''extraction IA.';
COMMENT ON COLUMN public.clients.company_creation_date IS
  'Date d''immatriculation / début d''activité. Utilisée pour la relance "anniversaire 1 an" sur les refus young_company.';
COMMENT ON COLUMN public.clients.legal_form IS
  'Forme juridique détaillée (SRL, SA, ASBL, indépendant personne physique...).';
COMMENT ON COLUMN public.clients.kyc_validated_at IS
  'Date de la dernière validation manuelle d''un KYC (rapport Graydon/CompanyWeb ou lookup auto BCE).';
COMMENT ON COLUMN public.clients.young_company_relaunched_at IS
  'Date du dernier envoi automatique de relance anniversaire pour ce client. Anti-double-envoi.';

CREATE INDEX IF NOT EXISTS idx_clients_company_creation_date
  ON public.clients (company_creation_date)
  WHERE company_creation_date IS NOT NULL;


-- 2. Table d'historique des analyses KYC
CREATE TABLE IF NOT EXISTS public.client_kyc_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('graydon', 'companyweb', 'pdf_other', 'auto_lookup')),
  file_path text,
  file_size integer,
  file_mime_type text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'analyzed', 'failed', 'validated')),
  ai_extraction jsonb,
  applied_fields jsonb,
  error_message text,
  analyzed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.client_kyc_reports IS
  'Historique des analyses KYC pour un client : rapport uploadé (Graydon/CompanyWeb/autre PDF) ou lookup auto BCE/SIRENE, et données structurées extraites par l''IA.';
COMMENT ON COLUMN public.client_kyc_reports.source IS
  'Origine de l''analyse : graydon, companyweb, pdf_other (autre PDF uploadé), auto_lookup (appel API BCE/SIRENE/VIES).';
COMMENT ON COLUMN public.client_kyc_reports.file_path IS
  'Chemin dans le bucket storage client-kyc-reports (format: {company_id}/{client_id}/{uuid}.pdf). NULL pour source=auto_lookup.';
COMMENT ON COLUMN public.client_kyc_reports.ai_extraction IS
  'JSON brut renvoyé par l''IA : champs détectés, valeurs proposées, score de confiance par champ.';
COMMENT ON COLUMN public.client_kyc_reports.applied_fields IS
  'JSON des champs effectivement validés et appliqués au client par l''admin (snapshot au moment du valider).';

CREATE INDEX IF NOT EXISTS idx_client_kyc_reports_client_id
  ON public.client_kyc_reports (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_kyc_reports_company_status
  ON public.client_kyc_reports (company_id, status);


-- 3. RLS sur client_kyc_reports : même pattern que clients
ALTER TABLE public.client_kyc_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_kyc_reports_company_isolation ON public.client_kyc_reports;
CREATE POLICY client_kyc_reports_company_isolation
  ON public.client_kyc_reports
  FOR ALL
  USING (company_id = get_user_company_id() OR is_admin_optimized())
  WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());


-- 4. RLS sur le bucket storage client-kyc-reports
-- Convention de path : {company_id}/{client_id}/{filename}
-- Le 1er segment doit matcher la company de l'utilisateur.

DROP POLICY IF EXISTS "client_kyc_reports_select" ON storage.objects;
CREATE POLICY "client_kyc_reports_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-kyc-reports'
    AND (
      (storage.foldername(name))[1]::uuid = get_user_company_id()
      OR is_admin_optimized()
    )
  );

DROP POLICY IF EXISTS "client_kyc_reports_insert" ON storage.objects;
CREATE POLICY "client_kyc_reports_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-kyc-reports'
    AND (
      (storage.foldername(name))[1]::uuid = get_user_company_id()
      OR is_admin_optimized()
    )
  );

DROP POLICY IF EXISTS "client_kyc_reports_update" ON storage.objects;
CREATE POLICY "client_kyc_reports_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-kyc-reports'
    AND (
      (storage.foldername(name))[1]::uuid = get_user_company_id()
      OR is_admin_optimized()
    )
  );

DROP POLICY IF EXISTS "client_kyc_reports_delete" ON storage.objects;
CREATE POLICY "client_kyc_reports_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-kyc-reports'
    AND (
      (storage.foldername(name))[1]::uuid = get_user_company_id()
      OR is_admin_optimized()
    )
  );

COMMIT;
