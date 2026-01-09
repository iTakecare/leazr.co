-- Drop the dangerous public SELECT policy
DROP POLICY IF EXISTS "Allow public access to valid upload links" ON public.offer_upload_links;

-- Create a SECURITY DEFINER function to validate tokens and return upload link data
-- This allows unauthenticated users to validate a specific token without enumerating all tokens
CREATE OR REPLACE FUNCTION public.validate_upload_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Get the upload link data for this specific token
  SELECT jsonb_build_object(
    'id', oul.id,
    'offer_id', oul.offer_id,
    'token', oul.token,
    'requested_documents', oul.requested_documents,
    'custom_message', oul.custom_message,
    'expires_at', oul.expires_at,
    'created_at', oul.created_at,
    'used_at', oul.used_at,
    'created_by', oul.created_by
  ) INTO result
  FROM public.offer_upload_links oul
  WHERE oul.token = p_token
    AND oul.expires_at > now()
    AND oul.used_at IS NULL
  LIMIT 1;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.validate_upload_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_upload_token(text) TO authenticated;