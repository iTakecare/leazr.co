-- Créer un système de permissions granulaires pour les utilisateurs

-- Table des permissions disponibles dans le système
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  module text NOT NULL, -- 'catalog', 'offers', 'clients', 'contracts', etc.
  action text NOT NULL, -- 'create', 'read', 'update', 'delete', 'manage'
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table de liaison entre utilisateurs et permissions
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted boolean DEFAULT true NOT NULL,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, permission_id)
);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour permissions (lecture pour tous les utilisateurs authentifiés)
CREATE POLICY "Permissions are viewable by authenticated users" 
ON public.permissions 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Politiques RLS pour user_permissions
CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user permissions" 
ON public.user_permissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage user permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Insérer les permissions de base du système
INSERT INTO public.permissions (name, description, module, action) VALUES
-- Catalogue
('catalog.create', 'Créer des produits dans le catalogue', 'catalog', 'create'),
('catalog.read', 'Voir le catalogue de produits', 'catalog', 'read'),
('catalog.update', 'Modifier les produits du catalogue', 'catalog', 'update'),
('catalog.delete', 'Supprimer des produits du catalogue', 'catalog', 'delete'),
('catalog.manage', 'Gestion complète du catalogue', 'catalog', 'manage'),

-- Offres
('offers.create', 'Créer des offres', 'offers', 'create'),
('offers.read', 'Consulter les offres', 'offers', 'read'),
('offers.update', 'Modifier les offres', 'offers', 'update'),
('offers.delete', 'Supprimer des offres', 'offers', 'delete'),
('offers.manage', 'Gestion complète des offres', 'offers', 'manage'),

-- Clients
('clients.create', 'Créer des clients', 'clients', 'create'),
('clients.read', 'Consulter la liste des clients', 'clients', 'read'),
('clients.update', 'Modifier les informations clients', 'clients', 'update'),
('clients.delete', 'Supprimer des clients', 'clients', 'delete'),
('clients.manage', 'Gestion complète des clients', 'clients', 'manage'),

-- Contrats
('contracts.create', 'Créer des contrats', 'contracts', 'create'),
('contracts.read', 'Consulter les contrats', 'contracts', 'read'),
('contracts.update', 'Modifier les contrats', 'contracts', 'update'),
('contracts.delete', 'Supprimer des contrats', 'contracts', 'delete'),
('contracts.manage', 'Gestion complète des contrats', 'contracts', 'manage'),

-- Ambassadeurs
('ambassadors.create', 'Créer des ambassadeurs', 'ambassadors', 'create'),
('ambassadors.read', 'Consulter les ambassadeurs', 'ambassadors', 'read'),
('ambassadors.update', 'Modifier les ambassadeurs', 'ambassadors', 'update'),
('ambassadors.delete', 'Supprimer des ambassadeurs', 'ambassadors', 'delete'),
('ambassadors.manage', 'Gestion complète des ambassadeurs', 'ambassadors', 'manage'),

-- Partenaires
('partners.create', 'Créer des partenaires', 'partners', 'create'),
('partners.read', 'Consulter les partenaires', 'partners', 'read'),
('partners.update', 'Modifier les partenaires', 'partners', 'update'),
('partners.delete', 'Supprimer des partenaires', 'partners', 'delete'),
('partners.manage', 'Gestion complète des partenaires', 'partners', 'manage'),

-- Paramètres
('settings.read', 'Consulter les paramètres', 'settings', 'read'),
('settings.update', 'Modifier les paramètres', 'settings', 'update'),
('settings.manage', 'Gestion complète des paramètres', 'settings', 'manage'),

-- Utilisateurs
('users.create', 'Créer des utilisateurs', 'users', 'create'),
('users.read', 'Consulter les utilisateurs', 'users', 'read'),
('users.update', 'Modifier les utilisateurs', 'users', 'update'),
('users.delete', 'Supprimer des utilisateurs', 'users', 'delete'),
('users.manage', 'Gestion complète des utilisateurs', 'users', 'manage'),

-- Dashboard
('dashboard.read', 'Accéder au tableau de bord', 'dashboard', 'read'),
('analytics.read', 'Consulter les analytics', 'analytics', 'read');

-- Fonction pour vérifier si un utilisateur a une permission spécifique
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  has_permission boolean := false;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  
  -- Les super_admin ont toutes les permissions
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Les admin ont toutes les permissions par défaut (sauf si explicitement refusées)
  IF user_role = 'admin' THEN
    -- Vérifier s'il y a une permission explicitement refusée
    SELECT NOT EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON up.permission_id = p.id
      WHERE up.user_id = p_user_id 
        AND p.name = p_permission_name 
        AND up.granted = false
        AND (up.expires_at IS NULL OR up.expires_at > now())
    ) INTO has_permission;
    
    RETURN has_permission;
  END IF;
  
  -- Pour les autres rôles, vérifier les permissions explicites
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id 
      AND p.name = p_permission_name 
      AND up.granted = true
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;

-- Fonction pour obtenir toutes les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE(
  permission_name text,
  permission_description text,
  module text,
  action text,
  granted boolean,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  
  -- Les super_admin ont toutes les permissions
  IF user_role = 'super_admin' THEN
    RETURN QUERY
    SELECT 
      p.name,
      p.description,
      p.module,
      p.action,
      true as granted,
      null::timestamp with time zone as expires_at
    FROM public.permissions p
    ORDER BY p.module, p.action;
    RETURN;
  END IF;
  
  -- Les admin ont toutes les permissions par défaut (sauf refusées explicitement)
  IF user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      p.name,
      p.description,
      p.module,
      p.action,
      COALESCE(up.granted, true) as granted,
      up.expires_at
    FROM public.permissions p
    LEFT JOIN public.user_permissions up ON p.id = up.permission_id AND up.user_id = p_user_id
    WHERE (up.expires_at IS NULL OR up.expires_at > now() OR up.expires_at IS NULL)
    ORDER BY p.module, p.action;
    RETURN;
  END IF;
  
  -- Pour les autres rôles, retourner seulement les permissions explicites
  RETURN QUERY
  SELECT 
    p.name,
    p.description,
    p.module,
    p.action,
    up.granted,
    up.expires_at
  FROM public.permissions p
  JOIN public.user_permissions up ON p.id = up.permission_id
  WHERE up.user_id = p_user_id 
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ORDER BY p.module, p.action;
END;
$$;