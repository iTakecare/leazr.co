-- Add columns to companies table for stats and data management
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS clients_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS devices_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS co2_saved NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());

-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-logos', 'Client Logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for client logos
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Client logos are publicly accessible',
  'true',
  'client-logos',
  '{SELECT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Company users can upload their client logos',
  'EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id::text = (storage.foldername(name))[1]
  )',
  'client-logos',
  '{INSERT, UPDATE, DELETE}'
) ON CONFLICT (name, bucket_id) DO NOTHING;