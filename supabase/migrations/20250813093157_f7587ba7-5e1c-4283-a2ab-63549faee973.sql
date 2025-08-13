-- Phase 1: Database extensions for multi-delivery addresses

-- Create client delivery sites table for predefined delivery locations
CREATE TABLE public.client_delivery_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'BE',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, site_name)
);

-- Add delivery address fields to offer_equipment table
ALTER TABLE public.offer_equipment 
ADD COLUMN delivery_type TEXT DEFAULT 'main_client',
ADD COLUMN delivery_site_id UUID REFERENCES public.client_delivery_sites(id),
ADD COLUMN delivery_address TEXT,
ADD COLUMN delivery_city TEXT,
ADD COLUMN delivery_postal_code TEXT,
ADD COLUMN delivery_country TEXT,
ADD COLUMN delivery_contact_name TEXT,
ADD COLUMN delivery_contact_email TEXT,
ADD COLUMN delivery_contact_phone TEXT,
ADD COLUMN delivery_notes TEXT;

-- Enable RLS for client_delivery_sites
ALTER TABLE public.client_delivery_sites ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for client_delivery_sites
CREATE POLICY "client_delivery_sites_company_access" 
ON public.client_delivery_sites 
FOR ALL 
USING (
  client_id IN (
    SELECT c.id 
    FROM public.clients c 
    WHERE c.company_id = get_user_company_id()
  ) 
  OR is_admin_optimized()
)
WITH CHECK (
  client_id IN (
    SELECT c.id 
    FROM public.clients c 
    WHERE c.company_id = get_user_company_id()
  ) 
  OR is_admin_optimized()
);

-- Create function to update updated_at for client_delivery_sites
CREATE OR REPLACE FUNCTION public.update_client_delivery_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger for client_delivery_sites
CREATE TRIGGER update_client_delivery_sites_updated_at
BEFORE UPDATE ON public.client_delivery_sites
FOR EACH ROW
EXECUTE FUNCTION public.update_client_delivery_sites_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_client_delivery_sites_client_id ON public.client_delivery_sites(client_id);
CREATE INDEX idx_client_delivery_sites_active ON public.client_delivery_sites(client_id, is_active) WHERE is_active = true;
CREATE INDEX idx_offer_equipment_delivery_site ON public.offer_equipment(delivery_site_id) WHERE delivery_site_id IS NOT NULL;