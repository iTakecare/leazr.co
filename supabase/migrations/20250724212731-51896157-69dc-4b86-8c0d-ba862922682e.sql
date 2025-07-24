-- Mettre à jour le logo dans les paramètres du site
UPDATE public.site_settings 
SET logo_url = 'https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/public/site-settings/logos/logo-1752910273455-f93ipr4y9zn.png',
    updated_at = now()
WHERE id = 1;