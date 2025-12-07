-- 1. Mettre à jour le workflow "Demande client - Achat" pour utiliser purchase_request
UPDATE workflow_templates 
SET offer_type = 'purchase_request' 
WHERE id = '3937a305-b2a8-4e25-871a-336b19751e72';

-- 2. Remplacer la fonction RPC pour supporter is_purchase
CREATE OR REPLACE FUNCTION get_workflow_for_offer_type(
  p_company_id UUID,
  p_offer_type TEXT,
  p_is_purchase BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  step_key TEXT,
  step_label TEXT,
  step_description TEXT,
  step_order INTEGER,
  icon_name TEXT,
  color_class TEXT,
  is_required BOOLEAN,
  is_visible BOOLEAN,
  enables_scoring BOOLEAN,
  scoring_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  selected_template_id UUID;
  effective_offer_type TEXT;
BEGIN
  -- Si is_purchase est true, forcer le type à purchase_request
  IF p_is_purchase = TRUE THEN
    effective_offer_type := 'purchase_request';
  ELSE
    effective_offer_type := p_offer_type;
  END IF;

  -- Trouver le template à utiliser (template par défaut ou premier actif)
  SELECT wt.id INTO selected_template_id
  FROM public.workflow_templates wt
  WHERE wt.company_id = p_company_id
    AND wt.offer_type = effective_offer_type
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, wt.created_at ASC
  LIMIT 1;
  
  -- Si aucun template trouvé pour purchase_request, fallback au type original
  IF selected_template_id IS NULL AND p_is_purchase = TRUE THEN
    SELECT wt.id INTO selected_template_id
    FROM public.workflow_templates wt
    WHERE wt.company_id = p_company_id
      AND wt.offer_type = p_offer_type
      AND wt.is_active = true
    ORDER BY wt.is_default DESC, wt.created_at ASC
    LIMIT 1;
  END IF;
  
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
$$;