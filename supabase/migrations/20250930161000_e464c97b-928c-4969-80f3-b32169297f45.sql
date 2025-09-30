-- Fix workflow step duplication issue
-- The problem: get_workflow_for_offer_type returns steps from ALL active templates
-- The solution: Return steps from only ONE template (default or first active)

DROP FUNCTION IF EXISTS public.get_workflow_for_offer_type(uuid, text);

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
   is_visible boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  selected_template_id UUID;
BEGIN
  -- First, find the template to use (default template or first active)
  SELECT wt.id INTO selected_template_id
  FROM public.workflow_templates wt
  WHERE wt.company_id = p_company_id
    AND wt.offer_type = p_offer_type
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, wt.created_at ASC
  LIMIT 1;
  
  -- If no template found, return empty result
  IF selected_template_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return steps from the selected template only
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
    ws.is_visible
  FROM public.workflow_templates wt
  JOIN public.workflow_steps ws ON ws.workflow_template_id = wt.id
  WHERE wt.id = selected_template_id
    AND ws.is_visible = true
  ORDER BY ws.step_order ASC;
END;
$function$;