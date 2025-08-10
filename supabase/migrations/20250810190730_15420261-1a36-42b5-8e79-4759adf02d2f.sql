-- Enhanced API key creation function with detailed logging
CREATE OR REPLACE FUNCTION public.create_api_key_secure_debug(p_name text, p_permissions jsonb DEFAULT '{"packs": true, "brands": true, "images": true, "products": true, "attributes": true, "categories": true, "environmental": true, "specifications": true}'::jsonb)
RETURNS TABLE(id uuid, name text, api_key text, permissions jsonb, is_active boolean, last_used_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, company_id uuid, created_by uuid, debug_info jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_company_id uuid;
  generated_api_key text;
  new_api_key_record record;
  debug_data jsonb;
BEGIN
  -- Collect debug information
  current_user_company_id := get_user_company_id();
  
  debug_data := jsonb_build_object(
    'auth_uid', auth.uid(),
    'user_company_id', current_user_company_id,
    'is_admin', is_admin_optimized(),
    'user_role', (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'function_called_at', now()
  );
  
  -- Check if user has a valid company
  IF current_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated or company not found. Debug: %', debug_data;
  END IF;
  
  -- Generate a secure API key using gen_random_uuid instead of gen_random_bytes
  generated_api_key := 'lzr_' || replace(gen_random_uuid()::text, '-', '');
  
  -- Log the attempt to insert
  RAISE NOTICE 'Attempting to insert API key with company_id: %, created_by: %', current_user_company_id, auth.uid();
  
  -- Insert the new API key
  INSERT INTO public.api_keys (
    name,
    api_key,
    company_id,
    created_by,
    permissions
  ) VALUES (
    p_name,
    generated_api_key,
    current_user_company_id,
    auth.uid(),
    p_permissions
  ) RETURNING * INTO new_api_key_record;
  
  -- Return the created record with debug info
  RETURN QUERY
  SELECT 
    new_api_key_record.id,
    new_api_key_record.name,
    new_api_key_record.api_key,
    new_api_key_record.permissions,
    new_api_key_record.is_active,
    new_api_key_record.last_used_at,
    new_api_key_record.created_at,
    new_api_key_record.updated_at,
    new_api_key_record.company_id,
    new_api_key_record.created_by,
    debug_data as debug_info;
    
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with debug info
    RAISE EXCEPTION 'API Key creation failed: %. Debug info: %', SQLERRM, debug_data;
END;
$$;