-- Add customization_data column to pdf_templates for storing template customizations
ALTER TABLE public.pdf_templates 
ADD COLUMN IF NOT EXISTS customization_data JSONB DEFAULT '{
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#64748b",
    "accent": "#8b5cf6"
  },
  "logo": {
    "url": null,
    "width": 120,
    "height": 60
  },
  "images": {},
  "texts": {},
  "sections": {}
}'::jsonb;

-- Add index for better performance on customization_data queries
CREATE INDEX IF NOT EXISTS idx_pdf_templates_customization_data 
ON public.pdf_templates USING gin(customization_data);

-- Add column for tracking template modifications
ALTER TABLE public.pdf_templates 
ADD COLUMN IF NOT EXISTS last_customized_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add column for template duplication tracking (id is TEXT not UUID)
ALTER TABLE public.pdf_templates 
ADD COLUMN IF NOT EXISTS duplicated_from_id TEXT REFERENCES public.pdf_templates(id) ON DELETE SET NULL;