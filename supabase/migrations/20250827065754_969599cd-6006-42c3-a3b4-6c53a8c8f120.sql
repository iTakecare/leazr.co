-- Update workflow_templates to support contract workflows
ALTER TABLE public.workflow_templates 
ADD COLUMN is_for_contracts BOOLEAN NOT NULL DEFAULT false;

-- Insert default contract workflow templates
INSERT INTO public.workflow_templates (company_id, name, description, offer_type, is_for_contracts, is_default, is_active)
SELECT 
  c.id,
  'Workflow Contrat Standard',
  'Processus standard pour le suivi des contrats',
  'standard',
  true,
  true,
  true
FROM public.companies c;

-- Insert contract workflow steps
WITH contract_templates AS (
  SELECT wt.id as template_id
  FROM public.workflow_templates wt
  WHERE wt.is_for_contracts = true
)
INSERT INTO public.workflow_steps (workflow_template_id, step_key, step_label, step_description, step_order, icon_name, color_class)
SELECT 
  ct.template_id,
  step_data.step_key,
  step_data.step_label,
  step_data.step_description,
  step_data.step_order,
  step_data.icon_name,
  step_data.color_class
FROM contract_templates ct
CROSS JOIN (
  VALUES 
    ('contract_sent', 'Envoyé', 'Contrat envoyé au client', 1, 'Send', 'bg-blue-500'),
    ('contract_signed', 'Signé', 'Contrat signé par le client', 2, 'CheckCircle', 'bg-green-500'),
    ('equipment_ordered', 'Commandé', 'Équipement commandé', 3, 'Package', 'bg-orange-500'),
    ('delivered', 'Livré', 'Équipement livré', 4, 'Truck', 'bg-green-500')
) AS step_data(step_key, step_label, step_description, step_order, icon_name, color_class);

-- Update the get_workflow_for_offer_type function to support contracts
CREATE OR REPLACE FUNCTION public.get_workflow_for_contract_type(p_company_id UUID, p_contract_type TEXT DEFAULT 'standard')
RETURNS TABLE(
  template_id UUID,
  template_name TEXT,
  step_key TEXT,
  step_label TEXT,
  step_description TEXT,
  step_order INTEGER,
  icon_name TEXT,
  color_class TEXT,
  is_required BOOLEAN,
  is_visible BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    ws.is_visible
  FROM public.workflow_templates wt
  JOIN public.workflow_steps ws ON ws.workflow_template_id = wt.id
  WHERE wt.company_id = p_company_id
    AND wt.is_for_contracts = true
    AND (wt.contract_type = p_contract_type OR wt.contract_type IS NULL)
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, ws.step_order ASC
  LIMIT 10; -- Limit to reasonable number of steps
END;
$$;