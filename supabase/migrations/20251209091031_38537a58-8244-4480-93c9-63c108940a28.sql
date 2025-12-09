-- Corriger les coefficients 36 mois de Grenke en utilisant les coefficients principaux des tranches
UPDATE public.leaser_duration_coefficients ldc
SET coefficient = lr.coefficient
FROM public.leaser_ranges lr
JOIN public.leasers l ON lr.leaser_id = l.id
WHERE ldc.leaser_range_id = lr.id
  AND ldc.duration_months = 36
  AND l.name ILIKE '%grenke%'
  AND lr.coefficient IS NOT NULL
  AND ldc.coefficient != lr.coefficient;