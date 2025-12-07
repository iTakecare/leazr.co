-- Supprimer les anciennes versions de la fonction
DROP FUNCTION IF EXISTS public.get_workflow_for_offer_type(uuid, text);
DROP FUNCTION IF EXISTS public.get_workflow_for_offer_type(uuid, text, boolean);

-- Recréer la fonction avec les champs de transition
CREATE FUNCTION public.get_workflow_for_offer_type(
  p_company_id uuid, 
  p_offer_type text,
  p_is_purchase boolean DEFAULT false
)
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
  scoring_type text,
  next_step_on_approval text,
  next_step_on_rejection text,
  next_step_on_docs_requested text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  selected_template_id UUID;
  effective_offer_type TEXT;
BEGIN
  -- Si is_purchase est true, prioriser le type 'purchase_request'
  IF p_is_purchase THEN
    effective_offer_type := 'purchase_request';
  ELSE
    effective_offer_type := p_offer_type;
  END IF;

  -- Trouver le template à utiliser
  SELECT wt.id INTO selected_template_id
  FROM public.workflow_templates wt
  WHERE wt.company_id = p_company_id
    AND wt.offer_type = effective_offer_type
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, wt.created_at ASC
  LIMIT 1;
  
  -- Si aucun template trouvé pour purchase_request, fallback sur le type original
  IF selected_template_id IS NULL AND p_is_purchase THEN
    SELECT wt.id INTO selected_template_id
    FROM public.workflow_templates wt
    WHERE wt.company_id = p_company_id
      AND wt.offer_type = p_offer_type
      AND wt.is_active = true
    ORDER BY wt.is_default DESC, wt.created_at ASC
    LIMIT 1;
  END IF;
  
  -- Si toujours aucun template trouvé, retourner vide
  IF selected_template_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner les steps du template sélectionné avec les colonnes de transition
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
    ws.scoring_type,
    ws.next_step_on_approval,
    ws.next_step_on_rejection,
    ws.next_step_on_docs_requested
  FROM public.workflow_templates wt
  JOIN public.workflow_steps ws ON ws.workflow_template_id = wt.id
  WHERE wt.id = selected_template_id
    AND ws.is_visible = true
  ORDER BY ws.step_order ASC;
END;
$function$;