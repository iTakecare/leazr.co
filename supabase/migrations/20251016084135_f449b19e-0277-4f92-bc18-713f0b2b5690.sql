-- Insert iTakecare v1 template for iTakecare company
INSERT INTO public.pdf_template_versions (
  company_id,
  template_slug,
  version,
  name,
  description,
  html_content,
  manifest,
  page_format,
  page_margins,
  is_active,
  is_default,
  template_category,
  supported_offer_types,
  created_by
)
SELECT 
  id as company_id,
  'itakecare-v1' as template_slug,
  '1.0.0' as version,
  'iTakecare - Modèle officiel' as name,
  'Template HTML officiel iTakecare avec design Canva fidèle - 7 pages complètes' as description,
  '<!-- Template chargé depuis le fichier externe -->' as html_content,
  '{
    "variables": [
      "client.name", "client.vat", "client.address", "client.contactName", "client.email", "client.phone",
      "offer.id", "offer.date", "offer.termMonths", "offer.startDate", "offer.totalMonthly", "offer.fees",
      "offer.insurance.enabled", "offer.insurance.annualEstimated",
      "items[]", "items[].label", "items[].brand", "items[].model", "items[].qty", "items[].unitMonthly", "items[].totalMonthly",
      "company.logoUrl", "company.name", "company.address", "company.email", "company.phone", "company.vat",
      "metrics.clientsCount", "metrics.devicesCount", "metrics.co2SavedTons"
    ],
    "fonts": ["Carlito"],
    "colors": {
      "primary": "#33638e",
      "secondary": "#4ab6c4",
      "accent": "#da2959"
    },
    "pages": 7,
    "helpers": ["currency", "date", "number"]
  }'::jsonb as manifest,
  'A4' as page_format,
  '{"top": "12mm", "bottom": "12mm", "left": "12mm", "right": "12mm"}'::jsonb as page_margins,
  true as is_active,
  true as is_default,
  'offer' as template_category,
  ARRAY['standard', 'admin_offer', 'ambassador_offer'] as supported_offer_types,
  (SELECT id FROM auth.users LIMIT 1) as created_by
FROM public.companies
WHERE name ILIKE '%itakecare%' OR slug = 'itakecare'
ON CONFLICT (company_id, template_slug, version) 
DO UPDATE SET
  html_content = EXCLUDED.html_content,
  manifest = EXCLUDED.manifest,
  updated_at = NOW();