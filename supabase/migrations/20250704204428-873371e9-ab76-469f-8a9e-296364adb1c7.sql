-- Création des tables pour le module Générateur de Parc

-- Table des profils métier avec besoins types
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  description TEXT,
  typical_team_size_min INTEGER DEFAULT 1,
  typical_team_size_max INTEGER DEFAULT 100,
  typical_budget_min NUMERIC DEFAULT 0,
  typical_budget_max NUMERIC DEFAULT 100000,
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des templates de parcs pré-configurés
CREATE TABLE public.fleet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_profile_id UUID REFERENCES public.business_profiles(id),
  description TEXT,
  team_size_min INTEGER DEFAULT 1,
  team_size_max INTEGER DEFAULT 100,
  estimated_budget NUMERIC DEFAULT 0,
  configuration JSONB NOT NULL DEFAULT '{}',
  equipment_list JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des configurations générées
CREATE TABLE public.fleet_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  client_id UUID REFERENCES public.clients(id),
  template_id UUID REFERENCES public.fleet_templates(id),
  name TEXT NOT NULL,
  business_sector TEXT,
  team_size INTEGER NOT NULL,
  budget NUMERIC,
  requirements JSONB DEFAULT '{}',
  generated_configuration JSONB NOT NULL DEFAULT '{}',
  equipment_list JSONB NOT NULL DEFAULT '[]',
  total_cost NUMERIC DEFAULT 0,
  monthly_cost NUMERIC DEFAULT 0,
  optimization_score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'optimized', 'approved', 'converted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des recommandations
CREATE TABLE public.fleet_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES public.fleet_configurations(id),
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact_score NUMERIC DEFAULT 0,
  cost_impact NUMERIC DEFAULT 0,
  data JSONB DEFAULT '{}',
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des logs d'utilisation
CREATE TABLE public.fleet_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  configuration_id UUID REFERENCES public.fleet_configurations(id),
  action TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Politiques RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_generation_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour business_profiles (lecture publique, écriture admin)
CREATE POLICY "business_profiles_read" ON public.business_profiles
FOR SELECT USING (true);

CREATE POLICY "business_profiles_admin_write" ON public.business_profiles
FOR ALL USING (is_admin_optimized());

-- Politiques pour fleet_templates (lecture publique, écriture admin)
CREATE POLICY "fleet_templates_read" ON public.fleet_templates
FOR SELECT USING (is_active = true);

CREATE POLICY "fleet_templates_admin_write" ON public.fleet_templates
FOR ALL USING (is_admin_optimized());

-- Politiques pour fleet_configurations (accès par entreprise)
CREATE POLICY "fleet_configurations_company_access" ON public.fleet_configurations
FOR ALL USING ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Politiques pour fleet_recommendations
CREATE POLICY "fleet_recommendations_access" ON public.fleet_recommendations
FOR ALL USING (
  configuration_id IN (
    SELECT id FROM public.fleet_configurations 
    WHERE (company_id = get_user_company_id()) OR is_admin_optimized()
  )
);

-- Politiques pour fleet_generation_logs
CREATE POLICY "fleet_generation_logs_access" ON public.fleet_generation_logs
FOR ALL USING (
  (user_id = auth.uid()) OR 
  (configuration_id IN (
    SELECT id FROM public.fleet_configurations 
    WHERE (company_id = get_user_company_id()) OR is_admin_optimized()
  ))
);

-- Triggers pour updated_at
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fleet_templates_updated_at
  BEFORE UPDATE ON public.fleet_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fleet_configurations_updated_at
  BEFORE UPDATE ON public.fleet_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertion des profils métier de base
INSERT INTO public.business_profiles (name, sector, description, typical_team_size_min, typical_team_size_max, typical_budget_min, typical_budget_max, requirements) VALUES
('Startup Tech', 'technology', 'Équipe de développement et produit en croissance', 3, 20, 5000, 50000, '{"performance": "high", "mobility": "medium", "graphics": "medium"}'),
('PME Bureau', 'office', 'Entreprise de services avec besoins bureautiques standards', 10, 100, 15000, 150000, '{"performance": "medium", "mobility": "low", "graphics": "low"}'),
('Studio Créatif', 'creative', 'Agence de design, vidéo et création graphique', 5, 30, 20000, 80000, '{"performance": "high", "mobility": "medium", "graphics": "high"}'),
('Équipe Mobile', 'sales', 'Commerciaux et consultants en déplacement', 5, 50, 10000, 60000, '{"performance": "medium", "mobility": "high", "graphics": "low"}'),
('Centre d''Appels', 'customer_service', 'Plateforme téléphonique et support client', 20, 200, 20000, 100000, '{"performance": "low", "mobility": "low", "graphics": "low"}');

-- Insertion des templates de base
INSERT INTO public.fleet_templates (name, business_profile_id, description, team_size_min, team_size_max, estimated_budget, configuration, equipment_list, is_active) VALUES
('Pack Startup Tech 10 postes', 
 (SELECT id FROM public.business_profiles WHERE name = 'Startup Tech'), 
 'Configuration optimale pour startup technologique de 10 développeurs',
 8, 15, 25000,
 '{"mix_ratio": {"new": 0.3, "refurbished": 0.7}, "categories": {"laptops": 10, "monitors": 10, "peripherals": 20}}',
 '[{"type": "laptop", "category": "development", "quantity": 10, "specs": {"ram": "16GB", "storage": "512GB SSD", "cpu": "Intel i7"}}, {"type": "monitor", "category": "standard", "quantity": 10, "specs": {"size": "24\"", "resolution": "1920x1080"}}]',
 true),
('Pack PME Bureau 25 postes',
 (SELECT id FROM public.business_profiles WHERE name = 'PME Bureau'),
 'Solution complète pour PME avec 25 collaborateurs',
 20, 35, 45000,
 '{"mix_ratio": {"new": 0.2, "refurbished": 0.8}, "categories": {"desktops": 20, "laptops": 5, "monitors": 25, "peripherals": 50}}',
 '[{"type": "desktop", "category": "office", "quantity": 20, "specs": {"ram": "8GB", "storage": "256GB SSD", "cpu": "Intel i5"}}, {"type": "laptop", "category": "mobile", "quantity": 5, "specs": {"ram": "8GB", "storage": "256GB SSD", "cpu": "Intel i5"}}]',
 true),
('Pack Studio Créatif 12 postes',
 (SELECT id FROM public.business_profiles WHERE name = 'Studio Créatif'),
 'Configuration haute performance pour studio créatif',
 10, 20, 60000,
 '{"mix_ratio": {"new": 0.6, "refurbished": 0.4}, "categories": {"workstations": 8, "laptops": 4, "monitors": 16, "peripherals": 24}}',
 '[{"type": "workstation", "category": "creative", "quantity": 8, "specs": {"ram": "32GB", "storage": "1TB SSD", "cpu": "Intel i9", "gpu": "RTX 4060"}}, {"type": "monitor", "category": "pro", "quantity": 16, "specs": {"size": "27\"", "resolution": "2560x1440", "color_accuracy": "99% sRGB"}}]',
 true);