-- =====================================================================
-- Assistant IA messagerie — suggestions persistantes (pattern Capptain,
-- adapté : déclenchement AUTOMATIQUE à la réception d'un message
-- WhatsApp/SMS, donc les suggestions sont stockées et validées en UI).
-- =====================================================================

-- Lien conversation ↔ demande (offre). Une conversation client porte en
-- général sur UN dossier ; l'IA propose la liaison, l'admin confirme.
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.message_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'email')),
  -- kind + payload :
  --   link_offer        {offer_id, offer_label}
  --   identify_client   {suggested_name}            (conversation non rattachée)
  --   task              {title, description, due_in_days, priority}
  --   classify_document {message_id, document_type}
  --   reply             {body}
  kind text NOT NULL CHECK (kind IN ('link_offer', 'identify_client', 'task', 'classify_document', 'reply')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

CREATE INDEX IF NOT EXISTS idx_message_ai_suggestions_conv
  ON public.message_ai_suggestions (conversation_id, status);

ALTER TABLE public.message_ai_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_ai_suggestions_company_access ON public.message_ai_suggestions;
CREATE POLICY message_ai_suggestions_company_access ON public.message_ai_suggestions
  FOR ALL USING (company_id = get_user_company_id() OR is_admin_optimized());

-- Realtime : les suggestions apparaissent en live dans l'inbox.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_ai_suggestions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
