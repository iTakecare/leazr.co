CREATE TABLE public.mollie_sepa_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mollie_sepa_changes_contract ON public.mollie_sepa_changes(contract_id);
ALTER TABLE public.mollie_sepa_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sepa changes"
ON public.mollie_sepa_changes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = mollie_sepa_changes.company_id)
);

CREATE POLICY "Company members can insert sepa changes"
ON public.mollie_sepa_changes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = mollie_sepa_changes.company_id)
);