-- Create enum for page formats
CREATE TYPE public.pdf_page_format AS ENUM ('A4', 'Letter', 'Legal');

-- Create table for PDF template versions
CREATE TABLE IF NOT EXISTS public.pdf_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  template_slug TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template HTML + assets
  html_content TEXT NOT NULL,
  css_content TEXT,
  manifest JSONB NOT NULL DEFAULT '{}',
  
  -- Assets (logos, polices, images)
  assets JSONB DEFAULT '[]',
  
  -- Configuration
  page_format TEXT DEFAULT 'A4',
  page_margins JSONB DEFAULT '{"top": "10mm", "bottom": "10mm", "left": "8mm", "right": "8mm"}',
  
  -- État
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Métadonnées
  template_category TEXT DEFAULT 'offer',
  supported_offer_types TEXT[] DEFAULT ARRAY['standard'],
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, template_slug, version)
);

-- Add column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_html_template_slug TEXT DEFAULT 'itakecare-v1';

-- Enable RLS
ALTER TABLE public.pdf_template_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates from their company"
  ON public.pdf_template_versions FOR SELECT
  USING (company_id = get_user_company_id() OR is_admin_optimized());

CREATE POLICY "Admins can manage templates"
  ON public.pdf_template_versions FOR ALL
  USING (is_admin_optimized())
  WITH CHECK (is_admin_optimized());

-- Indexes for performance
CREATE INDEX idx_pdf_template_versions_company ON pdf_template_versions(company_id);
CREATE INDEX idx_pdf_template_versions_slug ON pdf_template_versions(template_slug);
CREATE INDEX idx_pdf_template_versions_active ON pdf_template_versions(is_active) WHERE is_active = true;

-- Create storage bucket for PDF template assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdf-template-assets', 'pdf-template-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public read access for template assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdf-template-assets');

CREATE POLICY "Admins can upload template assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdf-template-assets' AND
  is_admin_optimized()
);

CREATE POLICY "Admins can update template assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pdf-template-assets' AND is_admin_optimized());

CREATE POLICY "Admins can delete template assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'pdf-template-assets' AND is_admin_optimized());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pdf_template_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_pdf_template_versions_updated_at
BEFORE UPDATE ON public.pdf_template_versions
FOR EACH ROW
EXECUTE FUNCTION update_pdf_template_versions_updated_at();