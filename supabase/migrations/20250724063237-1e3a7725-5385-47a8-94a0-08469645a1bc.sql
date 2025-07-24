-- Ajouter les colonnes manquantes à woocommerce_configs
ALTER TABLE public.woocommerce_configs 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS company_id uuid;

-- Migrer les user_id existants vers company_id en utilisant la table profiles
UPDATE public.woocommerce_configs 
SET company_id = (
  SELECT company_id 
  FROM public.profiles 
  WHERE profiles.id = woocommerce_configs.user_id
)
WHERE company_id IS NULL AND user_id IS NOT NULL;

-- Mettre à jour les noms manquants avec l'URL du site
UPDATE public.woocommerce_configs 
SET name = COALESCE(name, 'Configuration ' || site_url)
WHERE name IS NULL;

-- Rendre company_id obligatoire
ALTER TABLE public.woocommerce_configs 
ALTER COLUMN company_id SET NOT NULL;

-- Activer RLS sur la table
ALTER TABLE public.woocommerce_configs ENABLE ROW LEVEL SECURITY;

-- Créer la politique RLS pour l'isolation par entreprise
CREATE POLICY "woocommerce_configs_company_isolation" 
ON public.woocommerce_configs 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());