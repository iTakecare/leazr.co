-- Ajouter les colonnes manquantes explicitement
ALTER TABLE public.pdf_templates
ADD COLUMN template_html TEXT,
ADD COLUMN template_styles TEXT,
ADD COLUMN manifest_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN preview_url TEXT,
ADD COLUMN version TEXT DEFAULT '1.0.0',
ADD COLUMN description TEXT,
ADD COLUMN created_by UUID;