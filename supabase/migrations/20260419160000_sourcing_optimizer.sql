BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. Extension de la table suppliers pour le sourcing
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS sourcing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sourcing_adapter text,
  -- ex: 'chapp', 'apple_refurb', 'ingram_api', 'backmarket_pro', 'chrome_extension', 'manual_url'
  ADD COLUMN IF NOT EXISTS sourcing_config jsonb DEFAULT '{}'::jsonb,
  -- ex: { "search_url_template": "https://chapp.be/search?q={QUERY}", "api_key_ref": "vault:ingram_key" }
  ADD COLUMN IF NOT EXISTS avg_response_ms int,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS supports_refurbished boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_url text;

CREATE INDEX IF NOT EXISTS idx_suppliers_sourcing_enabled
  ON public.suppliers (company_id, sourcing_enabled) WHERE sourcing_enabled = true;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Audit des recherches de sourcing
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sourcing_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid,
  -- Contexte optionnel : recherche liée à une commande / contrat / offre
  equipment_order_unit_id uuid REFERENCES public.equipment_order_units(id) ON DELETE SET NULL,
  contract_equipment_id uuid REFERENCES public.contract_equipment(id) ON DELETE SET NULL,
  offer_equipment_id uuid REFERENCES public.offer_equipment(id) ON DELETE SET NULL,
  -- La requête
  query_text text NOT NULL,
  parsed_specs jsonb,                    -- { brand, model, ram, storage, color, ... } extrait par LLM
  -- Métriques
  duration_ms int,
  sources_attempted text[],              -- adapters appelés
  sources_succeeded text[],
  sources_failed text[],                 -- détail des échecs dans errors_detail
  errors_detail jsonb,                   -- { "chapp": "timeout", "coolblue": "404" }
  results_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sourcing_searches_company_created
  ON public.sourcing_searches (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sourcing_searches_user
  ON public.sourcing_searches (user_id, created_at DESC);

ALTER TABLE public.sourcing_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sourcing_searches_company_access" ON public.sourcing_searches
  FOR ALL
  USING (company_id = (SELECT profiles.company_id FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (company_id = (SELECT profiles.company_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════
-- 3. Snapshots des offres sélectionnées (lien avec commandes)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.order_line_sourcing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  -- Polymorphe : rattaché à une unité de commande OU un équipement de contrat OU d'offre
  equipment_order_unit_id uuid REFERENCES public.equipment_order_units(id) ON DELETE CASCADE,
  contract_equipment_id uuid REFERENCES public.contract_equipment(id) ON DELETE CASCADE,
  offer_equipment_id uuid REFERENCES public.offer_equipment(id) ON DELETE CASCADE,
  -- Référence au fournisseur (null si ingestion via URL manuelle d'un site non référencé)
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  -- Snapshot figé de l'offre au moment de la sélection
  offer_snapshot jsonb NOT NULL,
  -- { title, price_cents, delivery_cost_cents, delivery_days_min, delivery_days_max,
  --   condition, warranty_months, url, image_url, stock_status, raw_specs, ... }
  rank int,                              -- position dans le top 5 au moment de la recherche
  total_cost_cents int NOT NULL,
  -- Workflow
  status text NOT NULL DEFAULT 'selected',
  -- 'selected' | 'ordered' | 'received' | 'cancelled' | 'unavailable'
  selected_by uuid,
  selected_at timestamptz NOT NULL DEFAULT now(),
  supplier_order_ref text,               -- n° de commande chez le fournisseur une fois commandé
  ordered_at timestamptz,
  tracking_number text,
  received_at timestamptz,
  notes text,
  -- Lien avec la recherche d'origine
  sourcing_search_id uuid REFERENCES public.sourcing_searches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Assurer qu'au moins un lien est renseigné
  CONSTRAINT order_line_sourcing_has_target CHECK (
    equipment_order_unit_id IS NOT NULL
    OR contract_equipment_id IS NOT NULL
    OR offer_equipment_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_ols_order_unit ON public.order_line_sourcing (equipment_order_unit_id);
CREATE INDEX IF NOT EXISTS idx_ols_contract_eq ON public.order_line_sourcing (contract_equipment_id);
CREATE INDEX IF NOT EXISTS idx_ols_offer_eq ON public.order_line_sourcing (offer_equipment_id);
CREATE INDEX IF NOT EXISTS idx_ols_company_status ON public.order_line_sourcing (company_id, status);

ALTER TABLE public.order_line_sourcing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_line_sourcing_company_access" ON public.order_line_sourcing
  FOR ALL
  USING (company_id = (SELECT profiles.company_id FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (company_id = (SELECT profiles.company_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.tg_order_line_sourcing_updated()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ols_updated ON public.order_line_sourcing;
CREATE TRIGGER trigger_ols_updated
  BEFORE UPDATE ON public.order_line_sourcing
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_order_line_sourcing_updated();

-- ═══════════════════════════════════════════════════════════════════
-- 4. Mini-cache optionnel pour éviter le re-scrape identique < 5 min
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sourcing_session_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL,              -- hash SHA256(query_normalized)
  results jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sourcing_cache_hash
  ON public.sourcing_session_cache (query_hash);
CREATE INDEX IF NOT EXISTS idx_sourcing_cache_expires
  ON public.sourcing_session_cache (expires_at);

COMMIT;
