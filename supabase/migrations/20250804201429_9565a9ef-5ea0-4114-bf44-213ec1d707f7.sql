-- Phase 5: Advanced Features Database Schema (Fixed Order)

-- 1. Template Categories (create first as it's referenced by others)
CREATE TABLE public.template_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_category_id UUID REFERENCES public.template_categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.template_categories (name, description, icon, sort_order) VALUES
('Business', 'Templates for business documents', 'briefcase', 1),
('Invoice', 'Invoice and billing templates', 'receipt', 2),
('Contract', 'Contract and agreement templates', 'file-text', 3),
('Report', 'Report and analysis templates', 'bar-chart', 4),
('Letter', 'Letter and correspondence templates', 'mail', 5),
('Certificate', 'Certificate and award templates', 'award', 6);

-- Add versioning support to existing templates table
ALTER TABLE public.custom_pdf_templates 
ADD COLUMN version_number INTEGER DEFAULT 1,
ADD COLUMN is_locked BOOLEAN DEFAULT false,
ADD COLUMN locked_by UUID REFERENCES auth.users(id),
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN auto_save_data JSONB DEFAULT '{}',
ADD COLUMN collaboration_settings JSONB DEFAULT '{"real_time_editing": false, "require_approval": false}';

-- 2. Template Versions Table
CREATE TABLE public.custom_pdf_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  template_metadata JSONB NOT NULL DEFAULT '{}',
  changes_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_major_version BOOLEAN NOT NULL DEFAULT false,
  parent_version_id UUID REFERENCES public.custom_pdf_template_versions(id),
  UNIQUE(template_id, version_number)
);

-- 3. Template Library (Shared Templates)
CREATE TABLE public.template_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.template_categories(id),
  original_template_id UUID REFERENCES public.custom_pdf_templates(id),
  field_mappings JSONB NOT NULL DEFAULT '{}',
  template_metadata JSONB NOT NULL DEFAULT '{}',
  preview_image_url TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  rating_average NUMERIC(2,1) DEFAULT 0.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- RLS Policies
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_pdf_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template categories (public read, admin write)
CREATE POLICY "Template categories public read" ON public.template_categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Template categories admin write" ON public.template_categories
FOR ALL USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- RLS Policies for template versions
CREATE POLICY "Template versions access by company" ON public.custom_pdf_template_versions
FOR ALL USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- RLS Policies for template library (public read, admin write)
CREATE POLICY "Template library public read" ON public.template_library
FOR SELECT USING (is_public = true);

CREATE POLICY "Template library admin write" ON public.template_library
FOR ALL USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- Indexes for performance
CREATE INDEX idx_template_versions_template_id ON public.custom_pdf_template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON public.custom_pdf_template_versions(created_at);
CREATE INDEX idx_template_library_category ON public.template_library(category_id);
CREATE INDEX idx_template_library_public ON public.template_library(is_public) WHERE is_public = true;