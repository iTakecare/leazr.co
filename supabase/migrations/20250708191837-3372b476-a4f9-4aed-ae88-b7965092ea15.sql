
-- Corriger la fonction initialize_new_company pour utiliser les bons types de commission
CREATE OR REPLACE FUNCTION public.initialize_new_company(p_company_id uuid, p_company_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer des leasers par défaut pour la nouvelle entreprise
  INSERT INTO public.leasers (
    company_id,
    name,
    email,
    phone,
    created_at
  ) VALUES 
  (p_company_id, 'Leaser Principal', 'contact@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   '+33 1 00 00 00 00', now()),
  (p_company_id, 'Leaser Secondaire', 'secondaire@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   '+33 1 00 00 00 01', now());

  -- Créer des paramètres par défaut pour l'entreprise
  INSERT INTO public.company_customizations (
    company_id,
    company_name,
    primary_color,
    secondary_color,
    accent_color,
    created_at
  ) VALUES (
    p_company_id,
    p_company_name,
    '#3b82f6',
    '#64748b', 
    '#8b5cf6',
    now()
  ) ON CONFLICT (company_id) DO NOTHING;

  -- Créer des modèles de commission par défaut avec les bons types
  INSERT INTO public.commission_levels (
    name,
    type,
    is_default,
    created_at
  ) VALUES 
  ('Standard Ambassador', 'ambassador', true, now()),
  ('Standard Partner', 'partner', false, now())
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;
