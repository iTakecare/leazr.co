-- Create function to update company modules with proper permissions
CREATE OR REPLACE FUNCTION public.update_company_modules(
  p_company_id UUID,
  p_modules_enabled TEXT[],
  p_plan TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  modules_enabled TEXT[],
  plan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_modules TEXT[];
  core_modules TEXT[] := ARRAY['clients', 'offers', 'contracts'];
  missing_core_modules TEXT[];
  updated_company RECORD;
BEGIN
  -- Check if user is super admin
  IF NOT is_saas_admin() THEN
    RETURN QUERY SELECT false, 'Accès refusé. Seuls les super-admins peuvent modifier les modules.'::TEXT, NULL::TEXT[], NULL::TEXT;
    RETURN;
  END IF;

  -- Verify company exists
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = p_company_id) THEN
    RETURN QUERY SELECT false, 'Entreprise non trouvée.'::TEXT, NULL::TEXT[], NULL::TEXT;
    RETURN;
  END IF;

  -- Ensure core modules are always included
  missing_core_modules := ARRAY(
    SELECT unnest(core_modules)
    EXCEPT
    SELECT unnest(p_modules_enabled)
  );

  IF array_length(missing_core_modules, 1) > 0 THEN
    p_modules_enabled := p_modules_enabled || missing_core_modules;
  END IF;

  -- Update company
  UPDATE companies 
  SET 
    modules_enabled = p_modules_enabled,
    plan = COALESCE(p_plan, plan),
    updated_at = now()
  WHERE id = p_company_id
  RETURNING * INTO updated_company;

  -- Log the change
  INSERT INTO public.company_module_changes (
    company_id,
    modules_enabled,
    plan,
    changed_by,
    created_at
  ) VALUES (
    p_company_id,
    p_modules_enabled,
    updated_company.plan,
    auth.uid(),
    now()
  );

  RETURN QUERY SELECT 
    true, 
    'Modules mis à jour avec succès.'::TEXT, 
    updated_company.modules_enabled,
    updated_company.plan;
END;
$$;

-- Create table to track module changes
CREATE TABLE IF NOT EXISTS public.company_module_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  modules_enabled TEXT[] NOT NULL,
  plan TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.company_module_changes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "company_module_changes_admin_access" 
ON public.company_module_changes 
FOR ALL 
USING (is_saas_admin());