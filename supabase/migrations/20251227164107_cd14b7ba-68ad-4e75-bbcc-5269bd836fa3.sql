-- Update existing contracts to use commercial name instead of internal name
UPDATE public.contracts c
SET leaser_name = l.company_name
FROM public.leasers l
WHERE c.leaser_id = l.id
  AND l.company_name IS NOT NULL
  AND l.company_name != ''
  AND c.leaser_name = l.name
  AND c.leaser_name != l.company_name;