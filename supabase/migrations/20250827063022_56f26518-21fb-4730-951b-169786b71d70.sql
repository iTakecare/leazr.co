-- Create workflow_templates table for storing workflow configurations
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  offer_type TEXT NOT NULL, -- 'client_request', 'ambassador_offer', 'internal_offer', etc.
  contract_type TEXT, -- 'lease', 'purchase', etc. (nullable for offer-only workflows)
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_steps table for storing individual steps in workflows
CREATE TABLE public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL, -- 'draft', 'sent', 'internal_review', etc.
  step_label TEXT NOT NULL,
  step_description TEXT,
  step_order INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  icon_name TEXT, -- lucide icon name
  color_class TEXT, -- CSS class for step color
  conditions JSONB DEFAULT '{}', -- conditions for step visibility/availability
  notifications JSONB DEFAULT '{}', -- notification settings for this step
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "workflow_templates_company_access" 
ON public.workflow_templates 
FOR ALL 
USING (company_id = get_user_company_id() OR is_admin_optimized())
WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());

CREATE POLICY "workflow_steps_company_access" 
ON public.workflow_steps 
FOR ALL 
USING (workflow_template_id IN (
  SELECT id FROM public.workflow_templates 
  WHERE company_id = get_user_company_id() OR is_admin_optimized()
))
WITH CHECK (workflow_template_id IN (
  SELECT id FROM public.workflow_templates 
  WHERE company_id = get_user_company_id() OR is_admin_optimized()
));

-- Create indexes for better performance
CREATE INDEX idx_workflow_templates_company_id ON public.workflow_templates(company_id);
CREATE INDEX idx_workflow_templates_offer_type ON public.workflow_templates(offer_type);
CREATE INDEX idx_workflow_steps_template_id ON public.workflow_steps(workflow_template_id);
CREATE INDEX idx_workflow_steps_order ON public.workflow_steps(workflow_template_id, step_order);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_workflow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_workflow_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_templates_updated_at
BEFORE UPDATE ON public.workflow_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_workflow_templates_updated_at();

CREATE TRIGGER update_workflow_steps_updated_at
BEFORE UPDATE ON public.workflow_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_workflow_steps_updated_at();

-- Insert default workflow templates for existing offer types
-- 1. Client Request Workflow (no offer sending step)
INSERT INTO public.workflow_templates (company_id, name, description, offer_type, is_default)
SELECT 
  c.id,
  'Demande Client Standard',
  'Workflow pour les demandes directes des clients via le site',
  'client_request',
  true
FROM public.companies c;

-- 2. Ambassador Offer Workflow (traditional process)
INSERT INTO public.workflow_templates (company_id, name, description, offer_type, is_default)
SELECT 
  c.id,
  'Offre Ambassadeur Standard',
  'Workflow traditionnel avec envoi d''offre aux clients',
  'ambassador_offer',
  true
FROM public.companies c;

-- 3. Internal Offer Workflow
INSERT INTO public.workflow_templates (company_id, name, description, offer_type, is_default)
SELECT 
  c.id,
  'Offre Interne Standard',
  'Workflow pour les offres créées en interne',
  'internal_offer',
  true
FROM public.companies c;

-- Insert workflow steps for Client Request workflow
WITH client_request_templates AS (
  SELECT wt.id as template_id
  FROM public.workflow_templates wt
  WHERE wt.offer_type = 'client_request'
)
INSERT INTO public.workflow_steps (workflow_template_id, step_key, step_label, step_description, step_order, icon_name, color_class)
SELECT 
  crt.template_id,
  step_data.step_key,
  step_data.step_label,
  step_data.step_description,
  step_data.step_order,
  step_data.icon_name,
  step_data.color_class
FROM client_request_templates crt
CROSS JOIN (
  VALUES 
    ('draft', 'Brouillon', 'Demande en cours de préparation', 1, 'Circle', 'bg-gray-100'),
    ('internal_review', 'Analyse Interne', 'Analyse et validation en interne', 2, 'Clock', 'bg-blue-500'),
    ('leaser_review', 'Analyse Leaser', 'Validation par le partenaire financier', 3, 'Clock', 'bg-orange-500'),
    ('validated', 'Contrat Prêt', 'Demande validée, contrat en préparation', 4, 'CheckCircle', 'bg-green-500')
) AS step_data(step_key, step_label, step_description, step_order, icon_name, color_class);

-- Insert workflow steps for Ambassador Offer workflow
WITH ambassador_offer_templates AS (
  SELECT wt.id as template_id
  FROM public.workflow_templates wt
  WHERE wt.offer_type = 'ambassador_offer'
)
INSERT INTO public.workflow_steps (workflow_template_id, step_key, step_label, step_description, step_order, icon_name, color_class)
SELECT 
  aot.template_id,
  step_data.step_key,
  step_data.step_label,
  step_data.step_description,
  step_data.step_order,
  step_data.icon_name,
  step_data.color_class
FROM ambassador_offer_templates aot
CROSS JOIN (
  VALUES 
    ('draft', 'Brouillon', 'Offre en cours de préparation', 1, 'Circle', 'bg-gray-100'),
    ('sent', 'Offre Envoyée', 'Offre envoyée au client', 2, 'Clock', 'bg-blue-500'),
    ('internal_review', 'Analyse Interne', 'Analyse et validation en interne', 3, 'Clock', 'bg-orange-500'),
    ('leaser_review', 'Analyse Leaser', 'Validation par le partenaire financier', 4, 'Clock', 'bg-purple-500'),
    ('validated', 'Offre Validée', 'Offre validée et acceptée', 5, 'CheckCircle', 'bg-green-500')
) AS step_data(step_key, step_label, step_description, step_order, icon_name, color_class);

-- Insert workflow steps for Internal Offer workflow
WITH internal_offer_templates AS (
  SELECT wt.id as template_id
  FROM public.workflow_templates wt
  WHERE wt.offer_type = 'internal_offer'
)
INSERT INTO public.workflow_steps (workflow_template_id, step_key, step_label, step_description, step_order, icon_name, color_class)
SELECT 
  iot.template_id,
  step_data.step_key,
  step_data.step_label,
  step_data.step_description,
  step_data.step_order,
  step_data.icon_name,
  step_data.color_class
FROM internal_offer_templates iot
CROSS JOIN (
  VALUES 
    ('draft', 'Brouillon', 'Offre en cours de préparation', 1, 'Circle', 'bg-gray-100'),
    ('internal_review', 'Analyse Interne', 'Validation interne complète', 2, 'Clock', 'bg-blue-500'),
    ('validated', 'Offre Validée', 'Offre validée en interne', 3, 'CheckCircle', 'bg-green-500')
) AS step_data(step_key, step_label, step_description, step_order, icon_name, color_class);

-- Create function to get workflow for offer type
CREATE OR REPLACE FUNCTION public.get_workflow_for_offer_type(p_company_id UUID, p_offer_type TEXT)
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
    AND wt.offer_type = p_offer_type
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, ws.step_order ASC
  LIMIT 10; -- Limit to reasonable number of steps
END;
$$;