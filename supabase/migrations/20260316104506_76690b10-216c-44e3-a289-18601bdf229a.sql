
-- Table catalogue de logiciels
CREATE TABLE public.software_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  platform TEXT NOT NULL DEFAULT 'both' CHECK (platform IN ('mac', 'windows', 'both')),
  package_url TEXT,
  silent_install_command TEXT,
  icon_url TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('productivity', 'security', 'communication', 'utilities', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.software_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view software catalog for their company"
  ON public.software_catalog FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage software catalog for their company"
  ON public.software_catalog FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Table suivi des déploiements
CREATE TABLE public.software_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL,
  software_id UUID NOT NULL REFERENCES public.software_catalog(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'installing', 'success', 'failed')),
  initiated_by UUID REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.software_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deployments for their company"
  ON public.software_deployments FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage deployments for their company"
  ON public.software_deployments FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Table configuration MDM
CREATE TABLE public.mdm_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  mdm_type TEXT NOT NULL DEFAULT 'fleet' CHECK (mdm_type IN ('fleet', 'tactical_rmm', 'meshcentral', 'other')),
  api_url TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mdm_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view MDM config for their company"
  ON public.mdm_configurations FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage MDM config for their company"
  ON public.mdm_configurations FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
