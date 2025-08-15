-- Create the missing function create_primary_collaborator_for_client
CREATE OR REPLACE FUNCTION public.create_primary_collaborator_for_client(
  p_client_id UUID,
  p_client_name TEXT,
  p_client_email TEXT,
  p_contact_name TEXT
) 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert a primary collaborator for the client
  INSERT INTO public.collaborators (
    client_id,
    name,
    email,
    role,
    is_primary
  ) VALUES (
    p_client_id,
    COALESCE(p_contact_name, p_client_name),
    p_client_email,
    'Contact principal',
    true
  );
END;
$function$;