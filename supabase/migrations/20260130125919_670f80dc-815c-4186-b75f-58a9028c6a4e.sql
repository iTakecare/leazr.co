-- Create table for Zapier integrations
CREATE TABLE public.zapier_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  enabled_events JSONB NOT NULL DEFAULT '["contract_signed", "client_created", "offer_accepted"]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable Row Level Security
ALTER TABLE public.zapier_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for zapier_integrations
CREATE POLICY "Users can view their company's Zapier config" 
ON public.zapier_integrations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = zapier_integrations.company_id
  )
);

CREATE POLICY "Users can insert their company's Zapier config" 
ON public.zapier_integrations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = zapier_integrations.company_id
  )
);

CREATE POLICY "Users can update their company's Zapier config" 
ON public.zapier_integrations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = zapier_integrations.company_id
  )
);

CREATE POLICY "Users can delete their company's Zapier config" 
ON public.zapier_integrations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = zapier_integrations.company_id
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_zapier_integrations_updated_at
BEFORE UPDATE ON public.zapier_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();