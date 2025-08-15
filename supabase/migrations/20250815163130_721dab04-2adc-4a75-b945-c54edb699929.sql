-- Allow more flexibility in module deactivation by reducing core modules
CREATE OR REPLACE FUNCTION public.update_company_modules(p_company_id uuid, p_modules_enabled text[], p_plan text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text, modules_enabled text[], plan text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_modules TEXT[];
  -- Only keep truly essential modules as core - allow dashboard and other modules to be disabled
  core_modules TEXT[] := ARRAY[]::TEXT[];  -- No forced core modules, allow full control
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

  -- No forced core modules anymore - use exactly what was provided
  -- This allows SaaS admin to have full control over module activation/deactivation

  -- Update company with the exact modules provided
  UPDATE companies 
  SET 
    modules_enabled = p_modules_enabled,
    plan = COALESCE(p_plan, companies.plan),
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
$function$;