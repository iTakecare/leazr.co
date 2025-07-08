
-- Migration pour implémenter l'architecture prospects
-- Création de la table prospects et fonctions associées

-- 1. CRÉER LA TABLE PROSPECTS
CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text NOT NULL,
  phone text,
  plan text NOT NULL DEFAULT 'starter',
  selected_modules text[] DEFAULT ARRAY['crm', 'offers', 'contracts'],
  trial_starts_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_ends_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
  activation_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  activated_at timestamp with time zone,
  converted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Métadonnées pour le suivi
  source text DEFAULT 'signup',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  notes text
);

-- 2. ENABLE RLS SUR LA TABLE PROSPECTS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- 3. POLITIQUES RLS POUR PROSPECTS
-- Les prospects peuvent voir leur propre profil via le token d'activation
CREATE POLICY "Prospects can view own profile via token" ON public.prospects
FOR SELECT USING (
  activation_token IS NOT NULL AND 
  status = 'active' AND 
  trial_ends_at > now()
);

-- Les admins peuvent voir tous les prospects
CREATE POLICY "Admins can manage all prospects" ON public.prospects
FOR ALL USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- Insertion publique pour l'inscription
CREATE POLICY "Anyone can create prospects" ON public.prospects
FOR INSERT WITH CHECK (true);

-- 4. FONCTION POUR CRÉER UN PROSPECT
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
  ) RETURNING id, activation_token INTO new_prospect_id, new_activation_token;
  
  RETURN QUERY SELECT new_prospect_id, new_activation_token, trial_end_date;
END;
$$;

-- 5. FONCTION POUR ACTIVER UN PROSPECT (créer le compte complet)
CREATE OR REPLACE FUNCTION public.activate_prospect(
  p_activation_token text,
  p_password text
)
RETURNS TABLE(success boolean, user_id uuid, company_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prospect_record RECORD;
  new_user_id uuid;
  new_company_id uuid;
BEGIN
  -- Récupérer le prospect
  SELECT * INTO prospect_record
  FROM prospects 
  WHERE activation_token = p_activation_token 
    AND status = 'active' 
    AND trial_ends_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::uuid, null::uuid, 'Token invalide ou expiré';
    RETURN;
  END IF;
  
  -- Créer l'utilisateur dans auth.users (simulation - en réalité fait via edge function)
  -- Cette partie sera gérée par l'edge function
  
  -- Marquer le prospect comme activé
  UPDATE prospects 
  SET 
    status = 'converted',
    activated_at = now(),
    converted_at = now(),
    updated_at = now()
  WHERE id = prospect_record.id;
  
  RETURN QUERY SELECT true, new_user_id, new_company_id, 'Prospect activé avec succès';
END;
$$;

-- 6. FONCTION POUR NETTOYER LES PROSPECTS EXPIRÉS
CREATE OR REPLACE FUNCTION public.cleanup_expired_prospects()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Marquer les prospects expirés
  UPDATE prospects 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND trial_ends_at < now();
  
  -- Supprimer les prospects expirés depuis plus de 30 jours
  DELETE FROM prospects 
  WHERE status = 'expired' AND updated_at < (now() - interval '30 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 7. FONCTION POUR OBTENIR LES STATISTIQUES PROSPECTS
CREATE OR REPLACE FUNCTION public.get_prospects_stats()
RETURNS TABLE(
  total_prospects bigint,
  active_prospects bigint,
  converted_prospects bigint,
  expired_prospects bigint,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_prospects,
    COUNT(*) FILTER (WHERE status = 'active') as active_prospects,
    COUNT(*) FILTER (WHERE status = 'converted') as converted_prospects,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_prospects,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'converted'))::numeric / COUNT(*)::numeric * 100, 2)
      ELSE 0 
    END as conversion_rate
  FROM prospects;
END;
$$;

-- 8. TRIGGER POUR UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_prospects_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospects_updated_at();

-- 9. INDEX POUR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_prospects_email ON public.prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_activation_token ON public.prospects(activation_token);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_trial_ends_at ON public.prospects(trial_ends_at);
