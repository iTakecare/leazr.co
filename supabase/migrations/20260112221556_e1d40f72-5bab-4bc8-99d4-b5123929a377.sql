-- Remettre à NULL les dates d'achat de janvier 2026 pour ta société
UPDATE public.contract_equipment ce
SET actual_purchase_date = NULL
FROM public.contracts c
WHERE c.id = ce.contract_id
  AND c.company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
  AND ce.actual_purchase_date >= '2026-01-01'::date
  AND ce.actual_purchase_date < '2026-02-01'::date;