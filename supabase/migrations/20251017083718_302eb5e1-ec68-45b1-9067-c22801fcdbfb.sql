-- Ajouter les colonnes enables_scoring et scoring_type aux fonctions de workflow

DROP FUNCTION IF EXISTS public.get_workflow_for_offer_type(uuid, text);
DROP FUNCTION IF EXISTS public.get_workflow_for_contract_type(uuid, text);

-- Fonction pour récupérer le workflow d'un type d'offre avec colonnes de scoring
CREATE OR REPLACE FUNCTION public.get_workflow_for_offer_type(p_company_id uuid, p_offer_type text)
 RETURNS TABLE(
   template_id uuid, 
   template_name text, 
   step_key text, 
   step_label text, 
   step_description text, 
   step_order integer, 
   icon_name text, 
   color_class text, 
   is_required boolean, 
   is_visible boolean,
   enables_scoring boolean,
   scoring_type text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  selected_template_id UUID;
BEGIN
  -- Trouver le template à utiliser (template par défaut ou premier actif)
  SELECT wt.id INTO selected_template_id
  FROM public.workflow_templates wt
  WHERE wt.company_id = p_company_id
    AND wt.offer_type = p_offer_type
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, wt.created_at ASC
  LIMIT 1;
  
  -- Si aucun template trouvé, retourner vide
  IF selected_template_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner les steps du template sélectionné avec les colonnes de scoring
  RETURN QUERY
  SELECT 
    wt.id as template_id,
    wt.name as template_name,
    ws.step_key,
    ws.step_label,
    ws.step_description,
    ws.step_order,
    ws.icon_name,
    ws.color_class,
    ws.is_required,
    ws.is_visible,
    ws.enables_scoring,
    ws.scoring_type
  FROM public.workflow_templates wt
  JOIN public.workflow_steps ws ON ws.workflow_template_id = wt.id
  WHERE wt.id = selected_template_id
    AND ws.is_visible = true
  ORDER BY ws.step_order ASC;
END;
$function$;

-- Fonction pour récupérer le workflow d'un type de contrat avec colonnes de scoring
CREATE OR REPLACE FUNCTION public.get_workflow_for_contract_type(p_company_id uuid, p_contract_type text DEFAULT 'standard'::text)
 RETURNS TABLE(
   template_id uuid, 
   template_name text, 
   step_key text, 
   step_label text, 
   step_description text, 
   step_order integer, 
   icon_name text, 
   color_class text, 
   is_required boolean, 
   is_visible boolean,
   enables_scoring boolean,
   scoring_type text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id as template_id,
    wt.name as template_name,
    ws.step_key,
    ws.step_label,
    ws.step_description,
    ws.step_order,
    ws.icon_name,
    ws.color_class,
    ws.is_required,
    ws.is_visible,
    ws.enables_scoring,
    ws.scoring_type
  FROM public.workflow_templates wt
  JOIN public.workflow_steps ws ON ws.workflow_template_id = wt.id
  WHERE wt.company_id = p_company_id
    AND wt.is_for_contracts = true
    AND (wt.contract_type = p_contract_type OR wt.contract_type IS NULL)
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, ws.step_order ASC
  LIMIT 10;
END;
$function$;