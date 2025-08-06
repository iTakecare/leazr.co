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