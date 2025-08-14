-- Create platform settings table for centralized configuration
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'system', -- 'system', 'company_default', etc.
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Whether this setting can be accessed publicly
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage all platform settings" 
ON public.platform_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "Public settings can be read by anyone" 
ON public.platform_settings 
FOR SELECT 
USING (is_public = true);

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('default_company_info', '{
  "name": "Your Company",
  "address": "Your Company Address",
  "city": "Your City",
  "postal_code": "00000",
  "country": "BE",
  "vat_number": "BE 0000.000.000",
  "phone": "+32 XXX XX XX XX",
  "email": "contact@yourcompany.com",
  "website": "www.yourcompany.com"
}', 'company_default', 'Default company information for new companies', false),

('support_contact', '{
  "email": "support@leazr.co",
  "phone": "+32 XXX XX XX XX"
}', 'system', 'Platform support contact information', true),

('platform_branding', '{
  "platform_name": "Leazr",
  "primary_color": "#3b82f6",
  "secondary_color": "#64748b", 
  "accent_color": "#8b5cf6"
}', 'system', 'Platform branding configuration', true);

-- Create function to get platform setting
CREATE OR REPLACE FUNCTION public.get_platform_setting(p_setting_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  setting_result JSONB;
BEGIN
  SELECT setting_value INTO setting_result
  FROM public.platform_settings
  WHERE setting_key = p_setting_key;
  
  RETURN COALESCE(setting_result, '{}'::jsonb);
END;
$$;