
-- Corriger la fonction create_prospect pour résoudre l'ambiguïté
CREATE OR REPLACE FUNCTION public.create_prospect(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_company_name text,
  p_plan text DEFAULT 'starter',
  p_selected_modules text[] DEFAULT ARRAY['crm', 'offers', 'contracts']
)
RETURNS TABLE(prospect_id uuid, activation_token text, trial_ends_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_prospect_id uuid;
  new_activation_token text;
  trial_end_date timestamp with time zone;
BEGIN
  -- Vérifier si l'email existe déjà
  IF EXISTS (SELECT 1 FROM prospects WHERE email = p_email AND status = 'active') THEN
    RAISE EXCEPTION 'Un essai est déjà en cours pour cet email';
  END IF;
  
  -- Vérifier si l'email existe déjà dans auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Un compte existe déjà pour cet email';
  END IF;
  
  -- Calculer la date de fin d'essai
  trial_end_date := now() + interval '14 days';
  
  -- Insérer le prospect
  INSERT INTO prospects (
    email,
    first_name,
    last_name,
    company_name,
    plan,
    selected_modules,
    trial_ends_at
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
    p_company_name,
    p_plan,
    p_selected_modules,
    trial_end_date
  ) RETURNING id, prospects.activation_token INTO new_prospect_id, new_activation_token;
  
  RETURN QUERY SELECT new_prospect_id, new_activation_token, trial_end_date;
END;
$$;
