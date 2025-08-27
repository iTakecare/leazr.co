-- Mettre à jour l'URL du logo de plateforme avec la bonne URL Supabase Storage
UPDATE public.platform_settings 
SET logo_url = 'https://cifbetjefyfocafanlhv.supabase.co/storage/v1/object/public/site-settings/platform/logo-1753460298610-ziqeod7pnb.png',
    updated_at = now()
WHERE id IS NOT NULL;