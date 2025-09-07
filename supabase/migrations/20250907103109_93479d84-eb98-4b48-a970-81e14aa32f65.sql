-- Créer table de cache pour les recherches d'entreprises
CREATE TABLE public.company_enrichment_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_key TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'name', 'vat', 'siren', 'siret'
  country_code TEXT NOT NULL DEFAULT 'BE',
  company_data JSONB NOT NULL,
  source TEXT NOT NULL, -- 'opencorporates', 'vies', 'france', 'belgium', 'luxembourg'
  confidence_score NUMERIC DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- Index pour les recherches
CREATE INDEX idx_company_cache_search ON public.company_enrichment_cache(search_key, search_type, country_code);