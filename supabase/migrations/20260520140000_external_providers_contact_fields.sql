-- ============================================
-- EXTERNAL PROVIDERS: Contact fields for notifications
-- ============================================
-- Used when forwarding a client request to the provider so they can take
-- over and finalize the transaction with the client directly.

ALTER TABLE public.external_providers
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE public.external_providers
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Track that a provider has already been notified about a given offer so the
-- UI can show "Notifié le …" and avoid duplicate emails by accident.
CREATE TABLE IF NOT EXISTS public.offer_external_provider_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.external_providers(id) ON DELETE SET NULL,
  provider_name TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  notified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_provider_notif_offer
  ON public.offer_external_provider_notifications(offer_id);

ALTER TABLE public.offer_external_provider_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage provider notifications"
ON public.offer_external_provider_notifications FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.profiles p ON p.company_id = o.company_id
    WHERE o.id = offer_external_provider_notifications.offer_id AND p.id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.profiles p ON p.company_id = o.company_id
    WHERE o.id = offer_external_provider_notifications.offer_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Service role full access on provider notifications"
ON public.offer_external_provider_notifications FOR ALL TO service_role
USING (true) WITH CHECK (true);
