-- Improve create_primary_collaborator_for_client to inherit full client data
CREATE OR REPLACE FUNCTION public.create_primary_collaborator_for_client(
  p_client_id UUID,
  p_client_name TEXT,
  p_client_email TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL
) 
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
DECLARE
  new_collaborator_id UUID;
BEGIN
  -- Insert primary collaborator with full client information
  INSERT INTO public.collaborators (
    client_id,
    name,
    email,
    phone,
    role,
    is_primary
  ) VALUES (
    p_client_id,
    COALESCE(p_contact_name, p_client_name),
    p_client_email,
    p_client_phone,
    'Contact principal',
    true
  ) RETURNING id INTO new_collaborator_id;
  
  RETURN new_collaborator_id;
END;
$function$;

-- Update the auto-create trigger to pass phone number
CREATE OR REPLACE FUNCTION public.auto_create_primary_collaborator()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create primary collaborator with full client data
  PERFORM create_primary_collaborator_for_client(
    NEW.id,
    NEW.name,
    NEW.email,
    NEW.contact_name,
    NEW.phone
  );
  
  RETURN NEW;
END;
$$;