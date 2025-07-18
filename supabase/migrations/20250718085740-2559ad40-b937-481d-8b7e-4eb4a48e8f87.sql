-- Créer la table pour tracker les déploiements Netlify
CREATE TABLE public.netlify_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id TEXT,
  site_name TEXT,
  deploy_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  branch TEXT DEFAULT 'main',
  commit_ref TEXT,
  deploy_url TEXT,
  admin_url TEXT,
  site_url TEXT,
  error_message TEXT,
  deploy_time INTEGER, -- en secondes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Créer la table pour la configuration Netlify
CREATE TABLE public.netlify_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  site_id TEXT,
  site_name TEXT,
  custom_domain TEXT,
  auto_deploy BOOLEAN DEFAULT false,
  build_command TEXT DEFAULT 'npm run build',
  publish_directory TEXT DEFAULT 'dist',
  environment_variables JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_netlify_deployments_company_id ON public.netlify_deployments(company_id);
CREATE INDEX idx_netlify_deployments_status ON public.netlify_deployments(status);
CREATE INDEX idx_netlify_configurations_company_id ON public.netlify_configurations(company_id);

-- RLS policies
ALTER TABLE public.netlify_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.netlify_configurations ENABLE ROW LEVEL SECURITY;

-- Policies pour netlify_deployments
CREATE POLICY "Admin SaaS peut gérer tous les déploiements"
ON public.netlify_deployments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
);

-- Policies pour netlify_configurations  
CREATE POLICY "Admin SaaS peut gérer toutes les configurations"
ON public.netlify_configurations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_netlify_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_netlify_deployments_updated_at
  BEFORE UPDATE ON public.netlify_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_netlify_updated_at();

CREATE TRIGGER update_netlify_configurations_updated_at
  BEFORE UPDATE ON public.netlify_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_netlify_updated_at();