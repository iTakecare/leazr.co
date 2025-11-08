-- Migration pour restructurer company_metrics avec structure flexible
-- Étape 1: Sauvegarder les données existantes
CREATE TABLE IF NOT EXISTS public.company_metrics_backup AS 
SELECT * FROM public.company_metrics;

-- Étape 2: Supprimer l'ancienne table
DROP TABLE IF EXISTS public.company_metrics CASCADE;

-- Étape 3: Créer la nouvelle table avec structure flexible
CREATE TABLE public.company_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, metric_key)
);

-- Étape 4: Migrer les données existantes depuis la backup
INSERT INTO public.company_metrics (company_id, metric_key, label, value, icon_name, display_order, is_active)
SELECT 
  company_id,
  'client_satisfaction' as metric_key,
  'de clients satisfaits' as label,
  COALESCE(client_satisfaction_percent::text || '%', '0%') as value,
  'Heart' as icon_name,
  1 as display_order,
  true as is_active
FROM public.company_metrics_backup
WHERE client_satisfaction_percent IS NOT NULL

UNION ALL

SELECT 
  company_id,
  'devices_managed' as metric_key,
  'appareils dont nous prenons soin' as label,
  COALESCE(devices_count::text, '0') as value,
  'Laptop' as icon_name,
  2 as display_order,
  true as is_active
FROM public.company_metrics_backup
WHERE devices_count IS NOT NULL

UNION ALL

SELECT 
  company_id,
  'co2_saved' as metric_key,
  'quantité de CO2e économisée depuis le début de l''aventure' as label,
  COALESCE(co2_saved_kg::text || ' kg', '0 kg') as value,
  'Leaf' as icon_name,
  3 as display_order,
  true as is_active
FROM public.company_metrics_backup
WHERE co2_saved_kg IS NOT NULL;

-- Étape 5: Activer RLS
ALTER TABLE public.company_metrics ENABLE ROW LEVEL SECURITY;

-- Étape 6: Créer les policies
CREATE POLICY "Les utilisateurs peuvent voir les métriques de leur entreprise"
  ON public.company_metrics
  FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Les utilisateurs peuvent insérer des métriques pour leur entreprise"
  ON public.company_metrics
  FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Les utilisateurs peuvent modifier les métriques de leur entreprise"
  ON public.company_metrics
  FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Les utilisateurs peuvent supprimer les métriques de leur entreprise"
  ON public.company_metrics
  FOR DELETE
  USING (company_id = get_user_company_id());

-- Étape 7: Créer un trigger pour updated_at
CREATE TRIGGER update_company_metrics_updated_at
  BEFORE UPDATE ON public.company_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- Étape 8: Corriger company_partner_logos - renommer logo_name en name
ALTER TABLE public.company_partner_logos 
RENAME COLUMN logo_name TO name;