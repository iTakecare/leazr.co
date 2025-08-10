-- Create a secure function to handle API key creation
CREATE OR REPLACE FUNCTION public.create_api_key_secure(
  p_name text,
  p_permissions jsonb DEFAULT '{"products": true, "categories": true, "brands": true, "packs": true, "environmental": true, "images": true, "attributes": true, "specifications": true}'::jsonb
)
RETURNS TABLE(
  id uuid,
  name text,
  api_key text,
  permissions jsonb,
  is_active boolean,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  company_id uuid,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_company_id uuid;
  generated_api_key text;
  new_api_key_record record;
BEGIN
  -- Get the current user's company ID using the same function as RLS
  current_user_company_id := get_user_company_id();
  
  -- Check if user has a valid company
  IF current_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated or company not found';
  END IF;
  
  -- Generate a secure API key with the same logic as the client
  generated_api_key := 'lzr_';
  generated_api_key := generated_api_key || encode(gen_random_bytes(24), 'base64');
  generated_api_key := replace(generated_api_key, '/', '_');
  generated_api_key := replace(generated_api_key, '+', '-');
  generated_api_key := replace(generated_api_key, '=', '');
  
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
  
  -- Return the created record
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
    new_api_key_record.created_by;
END;
$function$;