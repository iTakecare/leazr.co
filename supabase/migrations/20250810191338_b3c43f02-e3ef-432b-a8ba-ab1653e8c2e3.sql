-- Drop the debug function since we have the corrected main function
DROP FUNCTION IF EXISTS public.create_api_key_secure_debug(text, jsonb);