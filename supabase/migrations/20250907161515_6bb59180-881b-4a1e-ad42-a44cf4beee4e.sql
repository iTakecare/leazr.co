-- Insert correct Grenke duration coefficients for 36 months
INSERT INTO public.leaser_duration_coefficients (leaser_range_id, duration_months, coefficient)
SELECT 
    lr.id,
    36,
    CASE 
        WHEN lr.min = 500 AND lr.max = 2500 THEN 3.53
        WHEN lr.min = 2500.01 AND lr.max = 5000 THEN 3.24
        WHEN lr.min = 5000.01 AND lr.max = 12500 THEN 3.16
        WHEN lr.min = 12500.01 AND lr.max = 25000 THEN 3.07
        WHEN lr.min = 25000.01 AND lr.max = 50000 THEN 2.99
        WHEN lr.min = 50000.01 AND lr.max = 100000 THEN 2.87
    END as coefficient
FROM public.leaser_ranges lr
JOIN public.leasers l ON lr.leaser_id = l.id
WHERE l.name = 'Grenke'
ON CONFLICT (leaser_range_id, duration_months) DO UPDATE SET
    coefficient = EXCLUDED.coefficient,
    updated_at = now();

-- Update offers with NULL leaser_id to use Grenke
UPDATE public.offers 
SET leaser_id = (
    SELECT id FROM public.leasers WHERE name = 'Grenke' LIMIT 1
),
updated_at = now()
WHERE leaser_id IS NULL;