-- Créer une table pour les profils de permissions prédéfinis
CREATE TABLE public.permission_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean DEFAULT false NOT NULL, -- Profils système non modifiables
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array des IDs de permissions
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Activer RLS
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour permission_profiles
CREATE POLICY "Permission profiles are viewable by authenticated users" 
ON public.permission_profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage permission profiles" 
ON public.permission_profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Insérer des profils de permissions par défaut
INSERT INTO public.permission_profiles (name, description, is_system, permissions) VALUES
('Administrateur complet', 'Accès complet à toutes les fonctionnalités', true, 
 (SELECT jsonb_agg(id) FROM public.permissions)),

('Gestionnaire commercial', 'Gestion des offres et clients uniquement', true,
 (SELECT jsonb_agg(id) FROM public.permissions 
  WHERE module IN ('offers', 'clients', 'dashboard') 
  AND action IN ('create', 'read', 'update', 'delete'))),

('Vendeur', 'Création et consultation des offres/clients', true,
 (SELECT jsonb_agg(id) FROM public.permissions 
  WHERE module IN ('offers', 'clients', 'dashboard') 
  AND action IN ('create', 'read', 'update'))),

('Consultant catalogue', 'Lecture seule du catalogue et des offres', true,
 (SELECT jsonb_agg(id) FROM public.permissions 
  WHERE module IN ('catalog', 'offers', 'clients', 'dashboard') 
  AND action = 'read')),

('Support client', 'Gestion des clients et consultation des contrats', true,
 (SELECT jsonb_agg(id) FROM public.permissions 
  WHERE module IN ('clients', 'contracts', 'dashboard') 
  AND action IN ('read', 'update')));

-- Fonction pour appliquer un profil de permissions à un utilisateur
CREATE OR REPLACE FUNCTION public.apply_permission_profile(p_user_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_permissions jsonb;
  permission_id uuid;
BEGIN
  -- Récupérer les permissions du profil
  SELECT permissions INTO profile_permissions 
  FROM public.permission_profiles 
  WHERE id = p_profile_id;
  
  IF profile_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  -- Supprimer toutes les permissions existantes de l'utilisateur
  DELETE FROM public.user_permissions WHERE user_id = p_user_id;
  
  -- Ajouter les nouvelles permissions
  FOR permission_id IN SELECT jsonb_array_elements_text(profile_permissions)::uuid
  LOOP
    INSERT INTO public.user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (p_user_id, permission_id, true, auth.uid())
    ON CONFLICT (user_id, permission_id) DO UPDATE SET
      granted = true,
      granted_by = auth.uid(),
      granted_at = now();
  END LOOP;
  
  RETURN true;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_permission_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_permission_profiles_updated_at
  BEFORE UPDATE ON public.permission_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permission_profiles_updated_at();