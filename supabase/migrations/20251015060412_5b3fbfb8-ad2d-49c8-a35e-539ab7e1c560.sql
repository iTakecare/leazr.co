-- Add template_design column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS template_design JSONB DEFAULT '{
  "sections": {
    "logo": {"enabled": true, "position": "left", "size": 120},
    "header": {"enabled": true, "title": "Offre Commerciale", "subtitle": ""},
    "clientInfo": {"enabled": true, "fields": ["name", "company", "email", "phone", "address"]},
    "equipmentTable": {"enabled": true, "columns": ["title", "quantity", "price", "total"]},
    "summary": {"enabled": true, "showMonthly": true, "showTotal": true},
    "footer": {"enabled": true, "text": "Offre valable 30 jours"}
  },
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#64748b",
    "accent": "#8b5cf6",
    "text": "#1e293b",
    "background": "#ffffff"
  },
  "fonts": {
    "title": {"size": 24, "weight": "bold"},
    "heading": {"size": 16, "weight": "bold"},
    "body": {"size": 10, "weight": "normal"}
  },
  "layout": {
    "pageMargin": 40,
    "sectionSpacing": 20,
    "borderRadius": 4
  }
}'::jsonb;

-- Remove unused columns from offers table
ALTER TABLE offers 
DROP COLUMN IF EXISTS pdf_template_id,
DROP COLUMN IF EXISTS pdf_customizations;