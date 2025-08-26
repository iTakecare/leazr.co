-- Restore Leazr branding in public_platform_settings
INSERT INTO public_platform_settings (
  company_name,
  logo_url,
  created_at,
  updated_at
) VALUES (
  'Leazr',
  '/leazr-logo.png',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  company_name = 'Leazr',
  logo_url = '/leazr-logo.png',
  updated_at = now();