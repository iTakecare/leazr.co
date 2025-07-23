
-- Modifier la structure pour supporter les coefficients par durée de financement
-- D'abord, ajouter une colonne duration_months à la table leaser_ranges
ALTER TABLE public.leaser_ranges 
ADD COLUMN duration_months integer NOT NULL DEFAULT 36;

-- Créer une table pour stocker les coefficients par durée pour chaque tranche
CREATE TABLE public.leaser_duration_coefficients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leaser_range_id uuid NOT NULL REFERENCES public.leaser_ranges(id) ON DELETE CASCADE,
  duration_months integer NOT NULL,
  coefficient numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(leaser_range_id, duration_months)
);

-- Activer RLS sur la nouvelle table
ALTER TABLE public.leaser_duration_coefficients ENABLE ROW LEVEL SECURITY;

-- Créer une politique RLS pour la nouvelle table
CREATE POLICY "leaser_duration_coefficients_company_strict_isolation" 
ON public.leaser_duration_coefficients 
FOR ALL 
USING (
  leaser_range_id IN (
    SELECT lr.id 
    FROM public.leaser_ranges lr
    JOIN public.leasers l ON lr.leaser_id = l.id
    WHERE (get_user_company_id() IS NOT NULL) AND 
    (
      (l.company_id = get_user_company_id()) OR 
      (
        is_admin_optimized() AND 
        get_current_user_email() LIKE '%@itakecare.be' AND 
        get_user_company_id() = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
      )
    )
  )
)
WITH CHECK (
  leaser_range_id IN (
    SELECT lr.id 
    FROM public.leaser_ranges lr
    JOIN public.leasers l ON lr.leaser_id = l.id
    WHERE (get_user_company_id() IS NOT NULL) AND 
    (l.company_id = get_user_company_id())
  )
);

-- Ajouter une colonne pour les durées disponibles sur la table leasers
ALTER TABLE public.leasers 
ADD COLUMN available_durations integer[] DEFAULT ARRAY[12,18,24,36,48,60,72];

-- Migrer les données existantes : créer des coefficients pour les durées standards
INSERT INTO public.leaser_duration_coefficients (leaser_range_id, duration_months, coefficient)
SELECT 
  lr.id,
  duration,
  lr.coefficient
FROM public.leaser_ranges lr
CROSS JOIN (VALUES (12), (18), (24), (36), (48), (60), (72)) AS durations(duration)
WHERE lr.coefficient IS NOT NULL;

-- Créer des triggers pour la mise à jour automatique des timestamps
CREATE OR REPLACE FUNCTION public.update_leaser_duration_coefficients_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_leaser_duration_coefficients_updated_at
  BEFORE UPDATE ON public.leaser_duration_coefficients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leaser_duration_coefficients_updated_at();
