-- Migration pour améliorer la gestion des contrats
-- Ajouter la fonction manquante pour récupérer les logs de workflow des contrats

-- Créer la fonction pour récupérer les logs de workflow d'un contrat
CREATE OR REPLACE FUNCTION public.get_contract_workflow_logs(contract_id uuid)
RETURNS TABLE(
  id uuid,
  contract_id uuid,
  user_id uuid,
  previous_status text,
  new_status text,
  reason text,
  created_at timestamp with time zone,
  user_name text,
  profiles jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cwl.id,
    cwl.contract_id,
    cwl.user_id,
    cwl.previous_status,
    cwl.new_status,
    cwl.reason,
    cwl.created_at,
    cwl.user_name,
    jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name
    ) as profiles
  FROM contract_workflow_logs cwl
  LEFT JOIN profiles p ON cwl.user_id = p.id
  WHERE cwl.contract_id = get_contract_workflow_logs.contract_id
  ORDER BY cwl.created_at DESC;
END;
$$;

-- Fonction pour créer un log de workflow lors des changements de statut
CREATE OR REPLACE FUNCTION public.create_contract_workflow_log(
  p_contract_id uuid,
  p_previous_status text,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_log_id uuid;
  current_user_id uuid;
  current_user_name text;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  current_user_id := auth.uid();
  
  -- Vérifier que l'utilisateur est authentifié
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- Récupérer le nom de l'utilisateur
  SELECT COALESCE(first_name || ' ' || last_name, 'Utilisateur inconnu') 
  INTO current_user_name 
  FROM profiles 
  WHERE id = current_user_id;
  
  -- Vérifier que l'utilisateur a le droit de modifier ce contrat
  IF NOT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = p_contract_id 
    AND (c.company_id = get_user_company_id() OR is_admin_optimized())
  ) THEN
    RAISE EXCEPTION 'Permission refusée pour ce contrat';
  END IF;
  
  -- Insérer le log
  INSERT INTO contract_workflow_logs (
    contract_id,
    user_id,
    previous_status,
    new_status,
    reason,
    user_name
  )
  VALUES (
    p_contract_id,
    current_user_id,
    p_previous_status,
    p_new_status,
    p_reason,
    current_user_name
  )
  RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;