-- Diagnostic function to check authentication context
CREATE OR REPLACE FUNCTION public.diagnose_api_key_context()
RETURNS TABLE(
  user_id uuid,
  company_id uuid,
  user_role text,
  is_admin boolean,
  has_company_access boolean,
  current_timestamp timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_company_id uuid;
  current_user_role text;
  admin_status boolean;
BEGIN
  -- Get current user's company ID
  current_user_company_id := get_user_company_id();
  
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Check admin status
  admin_status := is_admin_optimized();
  
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    current_user_company_id as company_id,
    current_user_role as user_role,
    admin_status as is_admin,
    (current_user_company_id IS NOT NULL) as has_company_access,
    now() as current_timestamp;
END;
$$;

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
  
  -- Generate a secure API key
  generated_api_key := 'lzr_';
  generated_api_key := generated_api_key || encode(gen_random_bytes(24), 'base64');
  generated_api_key := replace(generated_api_key, '/', '_');
  generated_api_key := replace(generated_api_key, '+', '-');
  generated_api_key := replace(generated_api_key, '=', '');
  
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