-- Create a more secure version that doesn't rely on extensions
DROP FUNCTION IF EXISTS public.create_api_key_secure(text, jsonb);

CREATE OR REPLACE FUNCTION public.create_api_key_secure(p_name text, p_permissions jsonb DEFAULT '{"packs": true, "brands": true, "images": true, "products": true, "attributes": true, "categories": true, "environmental": true, "specifications": true}'::jsonb)
RETURNS TABLE(id uuid, name text, api_key text, permissions jsonb, is_active boolean, last_used_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, company_id uuid, created_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_company_id uuid;
  generated_api_key text;
  new_api_key_record record;
  random_part1 text;
  random_part2 text;
BEGIN
  -- Get the current user's company ID using the same function as RLS
  current_user_company_id := get_user_company_id();
  
  -- Check if user has a valid company
  IF current_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated or company not found';
  END IF;
  
  -- Generate random parts using gen_random_uuid (available by default)
  random_part1 := replace(gen_random_uuid()::text, '-', '');
  random_part2 := replace(gen_random_uuid()::text, '-', '');
  
  -- Create API key with standard base64-like encoding
  generated_api_key := 'lzr_' || substr(random_part1 || random_part2, 1, 32);
  
  -- Insert the new API key
  INSERT INTO api_keys (
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
$$;