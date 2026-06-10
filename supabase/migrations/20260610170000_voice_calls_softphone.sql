-- =====================================================================
-- Téléphonie v1 — softphone Twilio Voice (clic-pour-appeler depuis la
-- fiche demande) + appels de l'agent IA Alex, journalisés dans voice_calls.
--
-- voice_calls existait pour l'agent ElevenLabs ; on l'étend pour porter
-- AUSSI les appels humains passés depuis le navigateur (provider
-- 'twilio_softphone'), avec enregistrement + transcription Whisper +
-- résumé IA, et le rattachement à une demande/conversation.
-- =====================================================================

ALTER TABLE public.voice_calls
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS recording_path text,
  ADD COLUMN IF NOT EXISTS recording_duration_secs integer,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS ai_actions jsonb;

-- provider peut désormais aussi être le softphone humain.
ALTER TABLE public.voice_calls DROP CONSTRAINT IF EXISTS voice_calls_provider_check;

-- consent_snapshot_at est NOT NULL pour l'agent IA (RGPD) ; un appel humain
-- au softphone n'a pas ce prérequis → on le rend nullable.
ALTER TABLE public.voice_calls ALTER COLUMN consent_snapshot_at DROP NOT NULL;

-- Élargir l'enum de statut pour le cycle de vie Twilio Voice.
ALTER TABLE public.voice_calls DROP CONSTRAINT IF EXISTS voice_calls_status_check;
ALTER TABLE public.voice_calls
  ADD CONSTRAINT voice_calls_status_check CHECK (status IN (
    'queued','ringing','in_progress','completed','failed','no_answer',
    'busy','canceled','transferred_to_human'
  ));

CREATE INDEX IF NOT EXISTS idx_voice_calls_offer ON public.voice_calls (offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_call_sid ON public.voice_calls (provider_call_sid);

-- Bucket privé pour les enregistrements d'appels.
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS call_recordings_company_read ON storage.objects;
CREATE POLICY call_recordings_company_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'call-recordings'
    AND ((storage.foldername(name))[1] = get_user_company_id()::text OR is_admin_optimized())
  );

-- Realtime : la transcription/le statut s'actualisent en direct dans la modale.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_calls;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Un appel softphone peut viser un numéro SANS client connu → client_id nullable.
ALTER TABLE public.voice_calls ALTER COLUMN client_id DROP NOT NULL;
