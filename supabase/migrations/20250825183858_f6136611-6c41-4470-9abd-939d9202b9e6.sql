-- Update platform settings to show iTakecare branding
UPDATE public_platform_settings 
SET 
  company_name = 'iTakecare',
  logo_url = 'https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/public/site-settings/platform/itakecare-logo.png',
  updated_at = now();