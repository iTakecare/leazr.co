-- =====================================================================
-- Messaging WhatsApp/SMS — phase 1 (tronc commun)
--
-- Le chat existant (chat_conversations / chat_messages, realtime déjà
-- actif) devient une inbox multi-canal : web (existant), whatsapp, sms.
-- Les notifications sortantes ET les conversations passent par les mêmes
-- tables, donc la même UI admin.
--
-- Détection WhatsApp : impossible a priori (Meta n'expose pas de check).
-- Stratégie : WhatsApp d'abord, fallback SMS sur échec de livraison,
-- et on mémorise le résultat sur clients.whatsapp_status.
-- =====================================================================

-- 1. clients — consentement + canal
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS messaging_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS whatsapp_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferred_channel text NOT NULL DEFAULT 'auto';

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_whatsapp_status_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_whatsapp_status_check
  CHECK (whatsapp_status IN ('unknown', 'yes', 'no'));

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_preferred_channel_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_preferred_channel_check
  CHECK (preferred_channel IN ('auto', 'whatsapp', 'sms', 'none'));

-- 2. chat_conversations — canal + rattachement client
--    client_phone en E.164 ; last_inbound_at porte la fenêtre de 24 h
--    WhatsApp (réponse libre autorisée si now() - last_inbound_at < 24 h).
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz;

ALTER TABLE public.chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_channel_check;
ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_channel_check
  CHECK (channel IN ('web', 'whatsapp', 'sms'));

CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_channel_phone
  ON public.chat_conversations (company_id, channel, client_phone);

-- 3. chat_messages — direction, traçabilité Twilio, médias
--    direction NULL = messages web historiques.
--    media_path = chemin dans le bucket privé chat-media.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS provider_sid text,
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_error text,
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS media_content_type text,
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_direction_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_direction_check
  CHECK (direction IS NULL OR direction IN ('inbound', 'outbound'));

CREATE INDEX IF NOT EXISTS idx_chat_messages_provider_sid
  ON public.chat_messages (provider_sid);

-- 4. messaging_settings — config par tenant (multi-tenant V1 comme Grenke :
--    iTakecare seul au départ, credentials Twilio en secrets edge functions).
--    templates: { "<key>": { "content_sid": "HX…", "body": "texte avec {{1}}",
--                            "label": "…" } }
--    content_sid sert à WhatsApp (template Meta approuvé), body au SMS.
CREATE TABLE IF NOT EXISTS public.messaging_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  whatsapp_sender text,
  sms_sender text,
  messaging_service_sid text,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messaging_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messaging_settings_company_access ON public.messaging_settings;
CREATE POLICY messaging_settings_company_access ON public.messaging_settings
  FOR ALL USING (company_id = get_user_company_id() OR is_admin_optimized());

-- 5. Bucket privé pour les médias entrants (photos de documents, etc.).
--    Chemin: <company_id>/<conversation_id>/<message_sid>-<n>.<ext>
--    Écrit par l'edge function (service role) ; lu par les membres de la
--    company via RLS sur le premier segment du chemin.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS chat_media_company_read ON storage.objects;
CREATE POLICY chat_media_company_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-media'
    AND ((storage.foldername(name))[1] = get_user_company_id()::text OR is_admin_optimized())
  );
