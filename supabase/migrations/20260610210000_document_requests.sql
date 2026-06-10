-- =====================================================================
-- Demandes de documents multi-canal (mail / WhatsApp / SMS).
-- Trace chaque demande (avec le lien d'upload) + les canaux utilisés, pour
-- l'afficher dans le détail de la demande et relancer si pas de retour.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  upload_token text,
  upload_url text,
  documents text[] NOT NULL DEFAULT '{}',
  custom_message text,
  -- canaux réellement envoyés + résultat par canal
  channels text[] NOT NULL DEFAULT '{}',
  email_status text,        -- sent | failed | null
  whatsapp_status text,     -- queued/sent/delivered/read/failed | null
  sms_status text,
  results jsonb,            -- détail par canal (sid, erreur…)
  fulfilled_at timestamptz, -- 1er document uploadé après la demande
  followup_notified_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_requests_offer ON public.document_requests (offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_requests_followup
  ON public.document_requests (created_at) WHERE fulfilled_at IS NULL AND followup_notified_at IS NULL;

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_requests_company_access ON public.document_requests;
CREATE POLICY document_requests_company_access ON public.document_requests
  FOR ALL USING (company_id = get_user_company_id() OR is_admin_optimized());

-- Realtime pour l'affichage en direct dans le détail de la demande.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Marque une demande "satisfaite" dès qu'un document est uploadé pour l'offre
-- après l'envoi (sert au suivi / arrête les relances).
CREATE OR REPLACE FUNCTION public.mark_document_requests_fulfilled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.document_requests
  SET fulfilled_at = now()
  WHERE offer_id = NEW.offer_id
    AND fulfilled_at IS NULL
    AND created_at <= NEW.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doc_request_fulfilled ON public.offer_documents;
CREATE TRIGGER trg_doc_request_fulfilled
  AFTER INSERT ON public.offer_documents
  FOR EACH ROW EXECUTE FUNCTION public.mark_document_requests_fulfilled();
