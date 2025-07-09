-- Corriger la fonction get_user_trial_status pour éliminer l'ambiguïté
CREATE OR REPLACE FUNCTION public.get_user_trial_status()
 RETURNS TABLE(is_trial boolean, trial_ends_at timestamp with time zone, days_remaining integer, company_name text, prospect_email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_email text;
  prospect_record record;
BEGIN
  -- Récupérer l'email de l'utilisateur actuel
  SELECT email INTO current_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Chercher dans la table prospects avec qualification complète des colonnes
  SELECT p.*, p.trial_ends_at as prospect_trial_ends_at INTO prospect_record
  FROM prospects p
  WHERE p.email = current_user_email 
    AND p.status = 'active' 
    AND p.trial_ends_at > now();
  
  IF FOUND THEN
    RETURN QUERY SELECT
      true as is_trial,
      prospect_record.prospect_trial_ends_at,
      GREATEST(0, EXTRACT(days FROM (prospect_record.prospect_trial_ends_at - now()))::integer) as days_remaining,
      prospect_record.company_name,
      prospect_record.email;
  ELSE
    RETURN QUERY SELECT
      false as is_trial,
      null::timestamp with time zone as trial_ends_at,
      0 as days_remaining,
      null::text as company_name,
      null::text as prospect_email;
  END IF;
END;
$function$;