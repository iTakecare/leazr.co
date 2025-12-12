-- Enable RLS on contract_templates table
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contract_templates
CREATE POLICY "Users can view contract templates from their company"
ON public.contract_templates FOR SELECT
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create contract templates for their company"
ON public.contract_templates FOR INSERT
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update contract templates from their company"
ON public.contract_templates FOR UPDATE
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete contract templates from their company"
ON public.contract_templates FOR DELETE
USING (company_id = get_user_company_id());