-- Préférences marketing / consentement pub par client + pré-réglages par ambassadeur.
-- Structure JSONB : clé = "own" (nos communications) ou UUID d'un partner ; valeur false = refus.
-- Clé absente ou true = consentement (opt-in par défaut → tout coché).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS marketing_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.clients.marketing_preferences IS
  'Consentement pub par canal marketing. Clé = "own" (nos communications) ou UUID d''un partner. Valeur false = refus. Clé absente ou true = consentement (opt-in par défaut).';

ALTER TABLE public.ambassadors
  ADD COLUMN IF NOT EXISTS default_marketing_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.ambassadors.default_marketing_preferences IS
  'Pré-réglage de consentement pub appliqué par défaut aux nouveaux clients rattachés à cet ambassadeur. Même structure que clients.marketing_preferences.';
