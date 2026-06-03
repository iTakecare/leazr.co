-- Contract succession / transfer link + issue reason.
--
-- 1) Succession link. Use case: a deal that moves from a natural person to a
--    company (e.g. Kevin Jadin → KJ Consult) ends one Grenke contract early and
--    starts another that "takes over" — which is why the successor shows a short
--    duration. We let the user link the two and record why.
--      previous_contract_id : the contract this one takes over from (predecessor)
--      link_reason          : free text, e.g. "Passage personne physique → société"
--
-- 2) Issue reason. The Grenke API never exposes WHY a contract is in trouble
--    (no arrears / termination-reason / bankruptcy field). So the reason is
--    captured manually in Leazr.
--      issue_type : 'faillite' | 'resiliation' | 'defaut_paiement' | 'litige' | 'autre'
--      issue_note : free text detail.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS previous_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link_reason text,
  ADD COLUMN IF NOT EXISTS issue_type text,
  ADD COLUMN IF NOT EXISTS issue_note text;

CREATE INDEX IF NOT EXISTS idx_contracts_previous_contract_id
  ON public.contracts(previous_contract_id);
