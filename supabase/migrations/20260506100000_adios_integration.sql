-- =====================================================
-- AdiOS integration: Meta Ads conversion attribution
-- =====================================================
--
-- 1) Add UTM / fbclid attribution columns on offers so we can identify
--    which leads came from Meta (Facebook / Instagram) ad campaigns.
--    Columns are nullable — zero impact on existing rows.
-- 2) Create adios_integrations table (per-company webhook config),
--    modeled on zapier_integrations.

-- ---------- 1) Attribution columns on offers ----------

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS landing_referrer TEXT,
  -- Populated by the import-meta-leads edge function. Values: 'facebook' or 'instagram'.
  -- Existing rows stay NULL and will fall back to source='meta' + free-text detection.
  ADD COLUMN IF NOT EXISTS meta_platform TEXT
    CHECK (meta_platform IS NULL OR meta_platform IN ('facebook', 'instagram')),
  -- Stamp set by the adios-proxy edge function once the conversion has been
  -- successfully delivered to AdiOS. Prevents double-counting on re-runs of
  -- the runtime trigger or the backfill job.
  ADD COLUMN IF NOT EXISTS adios_synced_at TIMESTAMP WITH TIME ZONE;

-- Index helps lookups when reporting Meta-attributed offers.
CREATE INDEX IF NOT EXISTS idx_offers_utm_source ON public.offers (utm_source)
  WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_meta_platform ON public.offers (meta_platform)
  WHERE meta_platform IS NOT NULL;
-- Used by the backfill to find offers still waiting to be synced.
CREATE INDEX IF NOT EXISTS idx_offers_adios_pending ON public.offers (company_id)
  WHERE adios_synced_at IS NULL AND source = 'meta';

-- Backfill existing Meta leads: parse the platform out of the remarks header
-- written by import-meta-leads. Best-effort; rows that don't match stay NULL.
UPDATE public.offers
   SET meta_platform = 'facebook'
 WHERE source = 'meta'
   AND meta_platform IS NULL
   AND remarks ILIKE '%Plateforme: Facebook%';

UPDATE public.offers
   SET meta_platform = 'instagram'
 WHERE source = 'meta'
   AND meta_platform IS NULL
   AND remarks ILIKE '%Plateforme: Instagram%';

-- ---------- 2) adios_integrations table ----------

CREATE TABLE IF NOT EXISTS public.adios_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Optional: include "lost" / "qualified" later. We start with "won" only.
  enabled_events JSONB NOT NULL DEFAULT '["contract_signed"]'::jsonb,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_status TEXT,        -- 'success' | 'error' | NULL
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.adios_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's AdiOS config"
  ON public.adios_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = adios_integrations.company_id
    )
  );

CREATE POLICY "Users can insert their company's AdiOS config"
  ON public.adios_integrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = adios_integrations.company_id
    )
  );

CREATE POLICY "Users can update their company's AdiOS config"
  ON public.adios_integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = adios_integrations.company_id
    )
  );

CREATE POLICY "Users can delete their company's AdiOS config"
  ON public.adios_integrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = adios_integrations.company_id
    )
  );

CREATE TRIGGER update_adios_integrations_updated_at
  BEFORE UPDATE ON public.adios_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
