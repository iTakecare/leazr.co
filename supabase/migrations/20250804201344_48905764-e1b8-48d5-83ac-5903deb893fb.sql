-- Phase 5: Advanced Features Database Schema

-- 1. Template Versions Table
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

-- 2. Template Changes Log
CREATE TABLE public.custom_pdf_template_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.custom_pdf_template_versions(id),
  change_type TEXT NOT NULL, -- 'field_added', 'field_modified', 'field_deleted', 'metadata_changed'
  field_path TEXT, -- JSON path to the changed field
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
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

-- 4. Template Categories
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

-- 5. Template Sharing
CREATE TABLE public.template_sharing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with_company_id UUID REFERENCES public.companies(id),
  shared_with_user_id UUID REFERENCES auth.users(id),
  permission_level TEXT NOT NULL DEFAULT 'view', -- 'view', 'edit', 'copy'
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message TEXT
);

-- 6. Template Collaborators
CREATE TABLE public.template_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'editor', -- 'owner', 'editor', 'viewer', 'reviewer'
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(template_id, user_id)
);

-- 7. Template Comments
CREATE TABLE public.template_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  field_id TEXT, -- Field ID if comment is on specific field
  position_x NUMERIC, -- X position if comment is positional
  position_y NUMERIC, -- Y position if comment is positional
  content TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'suggestion', 'issue', 'approval'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'archived'
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_comment_id UUID REFERENCES public.template_comments(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 8. Template Approvals
CREATE TABLE public.template_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.custom_pdf_template_versions(id),
  workflow_step INTEGER NOT NULL DEFAULT 1,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'skipped'
  approval_date TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE
);

-- 9. Template Usage Stats
CREATE TABLE public.template_usage_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  action_type TEXT NOT NULL, -- 'view', 'edit', 'generate', 'copy', 'share'
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER
);

-- 10. Template Performance Metrics
CREATE TABLE public.template_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'generation_time', 'error_rate', 'usage_frequency'
  metric_value NUMERIC NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, metric_type, measurement_date)
);

-- Add versioning support to existing templates table
ALTER TABLE public.custom_pdf_templates 
ADD COLUMN version_number INTEGER DEFAULT 1,
ADD COLUMN is_locked BOOLEAN DEFAULT false,
ADD COLUMN locked_by UUID REFERENCES auth.users(id),
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN auto_save_data JSONB DEFAULT '{}',
ADD COLUMN collaboration_settings JSONB DEFAULT '{"real_time_editing": false, "require_approval": false}';

-- Indexes for performance
CREATE INDEX idx_template_versions_template_id ON public.custom_pdf_template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON public.custom_pdf_template_versions(created_at);
CREATE INDEX idx_template_changes_template_id ON public.custom_pdf_template_changes(template_id);
CREATE INDEX idx_template_changes_created_at ON public.custom_pdf_template_changes(created_at);
CREATE INDEX idx_template_library_category ON public.template_library(category_id);
CREATE INDEX idx_template_library_public ON public.template_library(is_public) WHERE is_public = true;
CREATE INDEX idx_template_sharing_template ON public.template_sharing(template_id);
CREATE INDEX idx_template_collaborators_template ON public.template_collaborators(template_id);
CREATE INDEX idx_template_collaborators_user ON public.template_collaborators(user_id);
CREATE INDEX idx_template_comments_template ON public.template_comments(template_id);
CREATE INDEX idx_template_usage_stats_template ON public.template_usage_stats(template_id);
CREATE INDEX idx_template_usage_stats_date ON public.template_usage_stats(created_at);
CREATE INDEX idx_performance_metrics_template ON public.template_performance_metrics(template_id);

-- RLS Policies
ALTER TABLE public.custom_pdf_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_pdf_template_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template versions
CREATE POLICY "Template versions access by company" ON public.custom_pdf_template_versions
FOR ALL USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- RLS Policies for template changes
CREATE POLICY "Template changes access by company" ON public.custom_pdf_template_changes
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

-- RLS Policies for template categories (public read, admin write)
CREATE POLICY "Template categories public read" ON public.template_categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Template categories admin write" ON public.template_categories
FOR ALL USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- RLS Policies for template sharing
CREATE POLICY "Template sharing access" ON public.template_sharing
FOR ALL USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR 
  shared_with_company_id = get_user_company_id() OR
  shared_with_user_id = auth.uid() OR
  is_admin_optimized()
);

-- RLS Policies for template collaborators
CREATE POLICY "Template collaborators access" ON public.template_collaborators
FOR ALL USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR 
  user_id = auth.uid() OR
  is_admin_optimized()
);

-- RLS Policies for template comments
CREATE POLICY "Template comments access" ON public.template_comments
FOR ALL USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- RLS Policies for template approvals
CREATE POLICY "Template approvals access" ON public.template_approvals
FOR ALL USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR 
  approver_id = auth.uid() OR
  is_admin_optimized()
);

-- RLS Policies for template usage stats
CREATE POLICY "Template usage stats company access" ON public.template_usage_stats
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- RLS Policies for template performance metrics
CREATE POLICY "Template performance metrics access" ON public.template_performance_metrics
FOR ALL USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_template_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_library_updated_at
  BEFORE UPDATE ON public.template_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_library_updated_at();

CREATE TRIGGER update_template_comments_updated_at
  BEFORE UPDATE ON public.template_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_library_updated_at();

-- Insert default categories
INSERT INTO public.template_categories (name, description, icon, sort_order) VALUES
('Business', 'Templates for business documents', 'briefcase', 1),
('Invoice', 'Invoice and billing templates', 'receipt', 2),
('Contract', 'Contract and agreement templates', 'file-text', 3),
('Report', 'Report and analysis templates', 'bar-chart', 4),
('Letter', 'Letter and correspondence templates', 'mail', 5),
('Certificate', 'Certificate and award templates', 'award', 6);

-- Create auto-versioning function
CREATE OR REPLACE FUNCTION public.auto_create_template_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO next_version
  FROM public.custom_pdf_template_versions 
  WHERE template_id = NEW.id;
  
  -- Create version record
  INSERT INTO public.custom_pdf_template_versions (
    template_id,
    version_number,
    field_mappings,
    template_metadata,
    created_by,
    changes_description
  ) VALUES (
    NEW.id,
    next_version,
    NEW.field_mappings,
    NEW.template_metadata,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Initial version'
      ELSE 'Auto-saved version'
    END
  );
  
  -- Update template version number
  NEW.version_number = next_version;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-versioning
CREATE TRIGGER auto_create_template_version_trigger
  BEFORE INSERT OR UPDATE ON public.custom_pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_template_version();