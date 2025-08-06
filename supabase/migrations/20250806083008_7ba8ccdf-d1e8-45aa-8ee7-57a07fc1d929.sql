-- Create html_templates table for saving custom HTML templates
CREATE TABLE public.html_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.html_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for company isolation
CREATE POLICY "html_templates_company_access" 
ON public.html_templates 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_html_templates_updated_at
BEFORE UPDATE ON public.html_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for updating timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;