-- Présence des agents pour router les appels ENTRANTS vers le bon navigateur.
CREATE TABLE IF NOT EXISTS public.voice_presence (
  user_id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  identity text NOT NULL,
  online boolean NOT NULL DEFAULT true,
  last_seen timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voice_presence_company_access ON public.voice_presence;
CREATE POLICY voice_presence_company_access ON public.voice_presence
  FOR ALL USING (company_id = get_user_company_id() OR is_admin_optimized());

-- Numéro vocal → société (pour mapper le To d'un appel entrant).
ALTER TABLE public.messaging_settings ADD COLUMN IF NOT EXISTS voice_number text;
UPDATE public.messaging_settings SET voice_number = '+32460259772'
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
