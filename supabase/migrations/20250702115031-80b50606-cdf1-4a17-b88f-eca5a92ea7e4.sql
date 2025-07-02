-- Créer une fonction pour créer automatiquement un collaborateur principal
CREATE OR REPLACE FUNCTION create_primary_collaborator_for_client(
  p_client_id UUID,
  p_client_name TEXT,
  p_client_email TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  collaborator_name TEXT;
  collaborator_email TEXT;
  new_collaborator_id UUID;
BEGIN
  -- Déterminer le nom du collaborateur principal
  collaborator_name := COALESCE(p_contact_name, p_client_name, 'Responsable Principal');
  
  -- Utiliser l'email du client si disponible
  collaborator_email := p_client_email;
  
  -- Créer le collaborateur principal
  INSERT INTO public.collaborators (
    client_id,
    name,
    email,
    role,
    is_primary
  ) VALUES (
    p_client_id,
    collaborator_name,
    collaborator_email,
    'Responsable Principal',
    true
  ) RETURNING id INTO new_collaborator_id;
  
  RETURN new_collaborator_id;
END;
$$;

-- Créer la fonction trigger pour nouveaux clients
CREATE OR REPLACE FUNCTION auto_create_primary_collaborator()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer le collaborateur principal automatiquement
  PERFORM create_primary_collaborator_for_client(
    NEW.id,
    NEW.name,
    NEW.email,
    NEW.contact_name
  );
  
  RETURN NEW;
END;
$$;

-- Attacher le trigger à la table clients
DROP TRIGGER IF EXISTS trigger_auto_create_primary_collaborator ON public.clients;
CREATE TRIGGER trigger_auto_create_primary_collaborator
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_primary_collaborator();

-- Créer des collaborateurs principaux pour les clients existants qui n'en ont pas
DO $$
DECLARE
  client_record RECORD;
  collaborator_name TEXT;
  new_collaborator_id UUID;
BEGIN
  FOR client_record IN 
    SELECT c.id, c.name, c.email, c.contact_name
    FROM clients c
    LEFT JOIN collaborators col ON col.client_id = c.id AND col.is_primary = true
    WHERE col.id IS NULL
  LOOP
    -- Créer le collaborateur principal pour ce client
    SELECT create_primary_collaborator_for_client(
      client_record.id,
      client_record.name,
      client_record.email,
      client_record.contact_name
    ) INTO new_collaborator_id;
    
    RAISE NOTICE 'Collaborateur principal créé pour le client: % (ID: %)', client_record.name, new_collaborator_id;
  END LOOP;
END $$;