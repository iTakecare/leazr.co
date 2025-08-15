-- Fix ambiguous column reference in update_company_modules function
CREATE OR REPLACE FUNCTION public.update_company_modules(p_company_id uuid, p_modules_enabled text[], p_plan text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text, modules_enabled text[], plan text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Update company (fixed ambiguous column reference)
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