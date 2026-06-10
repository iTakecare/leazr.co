-- =====================================================================
-- Messagerie mail v2 — multi-comptes IMAP, sync incrémentale par UID,
-- envoi SMTP, mots de passe dans Vault (fini le base64).
--
-- Pourquoi : la boîte support v1 (user_imap_settings + sync full-scan
-- manuelle) re-scannait tout le serveur à chaque clic → lent. La v2
-- mémorise last_uid par dossier (imap_folders) et un cron toutes les
-- 2 min ne lit QUE les nouveaux messages.
-- =====================================================================

-- 1. Comptes IMAP/SMTP — partagés par la company (hello@, ecommerce@…
--    sont des boîtes d'équipe, pas des boîtes personnelles).
CREATE TABLE IF NOT EXISTS public.imap_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email_address text NOT NULL,
  imap_host text NOT NULL,
  imap_port integer NOT NULL DEFAULT 993,
  imap_use_ssl boolean NOT NULL DEFAULT true,
  imap_username text NOT NULL,
  smtp_host text,
  smtp_port integer DEFAULT 465,
  smtp_use_tls boolean DEFAULT true,
  smtp_username text,
  -- nom du secret Vault qui porte le mot de passe (commun IMAP/SMTP chez
  -- OVH et la plupart des hébergeurs)
  password_secret_name text,
  signature_html text,
  color text DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email_address)
);

ALTER TABLE public.imap_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS imap_accounts_company_access ON public.imap_accounts;
CREATE POLICY imap_accounts_company_access ON public.imap_accounts
  FOR ALL USING (company_id = get_user_company_id() OR is_admin_optimized());

-- 2. État de synchronisation par dossier (la clé de la vitesse :
--    on ne relit jamais ce qui précède last_uid).
CREATE TABLE IF NOT EXISTS public.imap_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.imap_accounts(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  special_use text,
  uidvalidity bigint,
  last_uid bigint NOT NULL DEFAULT 0,
  is_synced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, path)
);

ALTER TABLE public.imap_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS imap_folders_company_access ON public.imap_folders;
CREATE POLICY imap_folders_company_access ON public.imap_folders
  FOR ALL USING (
    account_id IN (
      SELECT id FROM public.imap_accounts
      WHERE company_id = get_user_company_id() OR is_admin_optimized()
    )
  );

-- 3. synced_emails — colonnes v2 + indexes (il n'y en avait AUCUN) +
--    accès company (boîtes partagées ; l'ancienne policy user_id reste
--    pour la rétrocompat).
-- Les boîtes v2 sont partagées par la société : un email n'appartient
-- plus à un utilisateur.
ALTER TABLE public.synced_emails ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.synced_emails
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.imap_accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS folder_path text NOT NULL DEFAULT 'INBOX',
  ADD COLUMN IF NOT EXISTS imap_uid bigint,
  ADD COLUMN IF NOT EXISTS cc_address text,
  ADD COLUMN IF NOT EXISTS has_attachments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments jsonb,
  ADD COLUMN IF NOT EXISTS in_reply_to text,
  ADD COLUMN IF NOT EXISTS header_message_id text;

CREATE INDEX IF NOT EXISTS idx_synced_emails_account_folder
  ON public.synced_emails (account_id, folder_path, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_synced_emails_company_received
  ON public.synced_emails (company_id, received_at DESC);
-- Non partiel : PostgREST upsert(onConflict) exige un index complet ;
-- les NULL (lignes v1) ne se heurtent pas entre eux.
CREATE UNIQUE INDEX IF NOT EXISTS uq_synced_emails_account_folder_uid
  ON public.synced_emails (account_id, folder_path, imap_uid);

DROP POLICY IF EXISTS synced_emails_company_access ON public.synced_emails;
CREATE POLICY synced_emails_company_access ON public.synced_emails
  FOR ALL USING (company_id = get_user_company_id() OR is_admin_optimized());

-- Realtime : arrivée des nouveaux mails en live dans l'UI.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.synced_emails;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. RPC Vault — set/get du mot de passe d'un compte (pattern Grenke).
CREATE OR REPLACE FUNCTION public.set_imap_account_password(
  p_account_id uuid,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_company uuid;
  v_name text;
  v_existing uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.imap_accounts WHERE id = p_account_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;
  IF auth.role() <> 'service_role'
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND company_id = v_company
     )
     AND NOT public.is_admin_optimized()
  THEN
    RAISE EXCEPTION 'unauthorized' USING errcode = '42501';
  END IF;

  v_name := 'imap_password_' || p_account_id::text;
  SELECT id INTO v_existing FROM vault.secrets WHERE name = v_name;
  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, p_password);
  ELSE
    PERFORM vault.create_secret(p_password, v_name);
  END IF;

  UPDATE public.imap_accounts
  SET password_secret_name = v_name, updated_at = now()
  WHERE id = p_account_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.set_imap_account_password(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_imap_account_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_imap_account_password(uuid, text) TO service_role;

-- Lecture : service_role uniquement (edge functions mail-sync / mail-send).
CREATE OR REPLACE FUNCTION public.get_imap_account_password(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_name text;
  v_secret text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'unauthorized' USING errcode = '42501';
  END IF;
  SELECT password_secret_name INTO v_name FROM public.imap_accounts WHERE id = p_account_id;
  IF v_name IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = v_name;
  RETURN v_secret;
END;
$$;
REVOKE ALL ON FUNCTION public.get_imap_account_password(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_imap_account_password(uuid) TO service_role;

-- 5. Migration des comptes v1 (user_imap_settings, mdp base64) vers la v2
--    (vault) + rattachement des emails déjà synchronisés.
DO $$
DECLARE
  r record;
  v_account_id uuid;
BEGIN
  FOR r IN SELECT * FROM public.user_imap_settings WHERE is_active = true LOOP
    INSERT INTO public.imap_accounts (
      company_id, display_name, email_address, imap_host, imap_port,
      imap_use_ssl, imap_username, smtp_host, smtp_port, smtp_use_tls,
      is_active
    ) VALUES (
      r.company_id, r.imap_username, r.imap_username, r.imap_host, r.imap_port,
      r.imap_use_ssl, r.imap_username,
      replace(r.imap_host, 'imap.', 'smtp.'), 465, true,
      true
    )
    ON CONFLICT (company_id, email_address) DO NOTHING
    RETURNING id INTO v_account_id;

    IF v_account_id IS NOT NULL THEN
      IF r.imap_password_encrypted IS NOT NULL THEN
        PERFORM public.set_imap_account_password(
          v_account_id,
          convert_from(decode(r.imap_password_encrypted, 'base64'), 'utf8')
        );
      END IF;
      INSERT INTO public.imap_folders (account_id, path, name, is_synced)
      VALUES (v_account_id, COALESCE(r.folder, 'INBOX'), 'Boîte de réception', true)
      ON CONFLICT (account_id, path) DO NOTHING;
      -- Rattache l'historique déjà synchronisé de cet utilisateur au compte.
      UPDATE public.synced_emails
      SET account_id = v_account_id
      WHERE user_id = r.user_id AND account_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- 6. Cron de sync toutes les 2 minutes (remplace le bouton manuel).
--    NB: le secret est embarqué en dur — pg_cron ne lit pas les env edge
--    (même piège que GRENKE_CRON_SECRET, documenté).
SELECT cron.unschedule('mail-sync-all') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mail-sync-all'
);
SELECT cron.schedule(
  'mail-sync-all',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/mail-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', 'bad95771a99ac9750cc38643a7b26796cd157bc164fef8fca95a2cf9f978c2a3'
    ),
    body := jsonb_build_object('action', 'sync_all')
  );
  $cron$
);
