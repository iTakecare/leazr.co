-- Corriger les coefficients Grenke pour le bon leaser
INSERT INTO public.leaser_duration_coefficients (leaser_range_id, duration_months, coefficient)
SELECT 
    lr.id,
    36,
    CASE 
        WHEN lr.min = 500 AND lr.max = 2500 THEN 3.53
        WHEN lr.min = 2500.01 AND lr.max = 5000 THEN 3.24
        WHEN lr.min = 5000.01 AND lr.max = 12500 THEN 3.1602  -- Coefficient exact pour 7178,48€
        WHEN lr.min = 12500.01 AND lr.max = 25000 THEN 3.07
        WHEN lr.min = 25000.01 AND lr.max = 50000 THEN 2.99
        WHEN lr.min = 50000.01 AND lr.max = 100000 THEN 2.87
    END as coefficient
FROM public.leaser_ranges lr
JOIN public.leasers l ON lr.leaser_id = l.id
WHERE l.name = '1. Grenke Lease'  -- Utiliser le bon nom
ON CONFLICT (leaser_range_id, duration_months) DO UPDATE SET
    coefficient = EXCLUDED.coefficient,
    updated_at = now();

-- Mettre à jour l'offre spécifique pour utiliser Grenke Lease
UPDATE public.offers 
SET leaser_id = (
    SELECT id FROM public.leasers WHERE name = '1. Grenke Lease' LIMIT 1
),
updated_at = now()
WHERE id = 'ae3f4882-78da-41ee-88ed-3236469793c8';

-- Mettre à jour toutes les autres offres avec NULL leaser_id
UPDATE public.offers 
SET leaser_id = (
    SELECT id FROM public.leasers WHERE name = '1. Grenke Lease' LIMIT 1
),
updated_at = now()
WHERE leaser_id IS NULL AND id != 'ae3f4882-78da-41ee-88ed-3236469793c8';