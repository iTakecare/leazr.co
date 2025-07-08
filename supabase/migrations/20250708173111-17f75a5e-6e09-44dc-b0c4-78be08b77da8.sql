-- Migration pour corriger complètement l'isolation des données
-- Version finale corrigée

-- 1. CRÉER LA TABLE MODULES MANQUANTE
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insérer les modules par défaut
INSERT INTO public.modules (name, slug, description) VALUES
('CRM', 'crm', 'Gestion de la relation client'),
('Offres', 'offers', 'Gestion des offres commerciales'),
('Contrats', 'contracts', 'Gestion des contrats'),
('Catalogue', 'catalog', 'Gestion du catalogue produits'),
('Facturation', 'invoicing', 'Gestion de la facturation')
ON CONFLICT (slug) DO NOTHING;

-- 2. CORRIGER LA FONCTION INITIALIZE_NEW_COMPANY 
CREATE OR REPLACE FUNCTION public.initialize_new_company(p_company_id uuid, p_company_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer des leasers par défaut pour la nouvelle entreprise
  INSERT INTO public.leasers (
    company_id,
    name,
    email,
    company_name,
    phone,
    address,
    city,
    country,
    created_at
  ) VALUES 
  (p_company_id, 'Leaser Principal', 'contact@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   p_company_name, '+33 1 00 00 00 00', 'Adresse par défaut', 'Ville', 'France', now()),
  (p_company_id, 'Leaser Secondaire', 'secondaire@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   p_company_name, '+33 1 00 00 00 01', 'Adresse secondaire', 'Ville', 'France', now());

  -- Créer des paramètres par défaut pour l'entreprise
  INSERT INTO public.company_customizations (
    company_id,
    company_name,
    primary_color,
    secondary_color,
    accent_color,
    created_at
  ) VALUES (
    p_company_id,
    p_company_name,
    '#3b82f6',
    '#64748b', 
    '#8b5cf6',
    now()
  ) ON CONFLICT (company_id) DO NOTHING;

  -- Créer des modèles de commission par défaut avec les bons types
  INSERT INTO public.commission_levels (
    name,
    type,
    is_default,
    created_at
  ) VALUES 
  ('Standard Ambassador', 'ambassador', true, now()),
  ('Premium Ambassador', 'ambassador', false, now()),
  ('Standard Partner', 'partner', true, now()),
  ('Premium Partner', 'partner', false, now())
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- 3. FONCTION DE NETTOYAGE POUR LES UTILISATEURS EXISTANTS SANS PROFIL
CREATE OR REPLACE FUNCTION public.fix_user_without_profile(p_user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id uuid;
  new_company_id uuid;
  result jsonb;
BEGIN
  -- Récupérer l'ID utilisateur
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = p_user_email;
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Utilisateur non trouvé');
  END IF;
  
  -- Vérifier si l'utilisateur a déjà un profil
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'L''utilisateur a déjà un profil');
  END IF;
  
  -- Créer une entreprise pour cet utilisateur
  INSERT INTO companies (
    name,
    plan,
    account_status,
    trial_starts_at,
    trial_ends_at,
    is_active
  ) VALUES (
    'Nouvelle Entreprise - ' || p_user_email,
    'starter',
    'trial',
    now(),
    now() + interval '14 days',
    true
  ) RETURNING id INTO new_company_id;
  
  -- Créer le profil utilisateur
  INSERT INTO profiles (
    id,
    first_name,
    last_name,
    role,
    company_id
  ) VALUES (
    user_id,
    'Prénom',
    'Nom',
    'admin',
    new_company_id
  );
  
  -- Initialiser l'entreprise avec les données par défaut
  PERFORM initialize_new_company(new_company_id, 'Nouvelle Entreprise - ' || p_user_email);
  
  RETURN jsonb_build_object(
    'success', true, 
    'company_id', new_company_id,
    'user_id', user_id,
    'message', 'Profil et entreprise créés avec succès'
  );
END;
$$;

-- 4. AMÉLIORER LA FONCTION DE CRÉATION D'ENTREPRISE
CREATE OR REPLACE FUNCTION public.create_company_with_admin_complete(
  p_company_name text,
  p_admin_email text,
  p_admin_first_name text,
  p_admin_last_name text,
  p_plan text DEFAULT 'starter'
)
RETURNS TABLE(company_id uuid, user_id uuid, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_company_id uuid;
  admin_user_id uuid;
  existing_profile_company_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur admin
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = p_admin_email 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur admin non trouvé pour l''email: %', p_admin_email;
  END IF;

  -- Vérifier si l'utilisateur a déjà un profil avec une entreprise
  SELECT company_id INTO existing_profile_company_id
  FROM profiles 
  WHERE id = admin_user_id;
  
  -- Si l'utilisateur a déjà un profil avec une entreprise, retourner ces informations
  IF existing_profile_company_id IS NOT NULL THEN
    RETURN QUERY SELECT existing_profile_company_id, admin_user_id, true;
    RETURN;
  END IF;

  -- Créer l'entreprise
  INSERT INTO companies (
    name,
    plan,
    account_status,
    trial_starts_at,
    trial_ends_at,
    is_active
  ) VALUES (
    p_company_name,
    p_plan,
    'trial',
    now(),
    now() + interval '14 days',
    true
  ) RETURNING id INTO new_company_id;

  -- Créer ou mettre à jour le profil admin
  INSERT INTO profiles (
    id,
    first_name,
    last_name,
    role,
    company_id
  ) VALUES (
    admin_user_id,
    p_admin_first_name,
    p_admin_last_name,
    'admin',
    new_company_id
  ) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    updated_at = now();

  -- Initialiser l'entreprise avec les données par défaut
  PERFORM initialize_new_company(new_company_id, p_company_name);

  RETURN QUERY SELECT new_company_id, admin_user_id, true;
END;
$$;

-- 5. RENFORCER L'ISOLATION DES DONNÉES - POLITIQUES RLS ULTRA-STRICTES

-- 5.1 Produits - isolation stricte
DROP POLICY IF EXISTS "Products strict company isolation" ON public.products;
CREATE POLICY "Products strict company isolation" ON public.products
FOR ALL USING (
  get_user_company_id() IS NOT NULL 
  AND company_id = get_user_company_id()
  AND company_id != (SELECT id FROM companies WHERE name = 'iTakecare' LIMIT 1)
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND company_id = get_user_company_id()
);

-- 5.2 Leasers - isolation stricte  
DROP POLICY IF EXISTS "Leasers strict company isolation" ON public.leasers;
CREATE POLICY "Leasers strict company isolation" ON public.leasers
FOR ALL USING (
  get_user_company_id() IS NOT NULL 
  AND company_id = get_user_company_id()
  AND company_id != (SELECT id FROM companies WHERE name = 'iTakecare' LIMIT 1)
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND company_id = get_user_company_id()
);

-- 5.3 Company Customizations - isolation stricte
DROP POLICY IF EXISTS "Users can view their company customizations" ON public.company_customizations;
DROP POLICY IF EXISTS "Users can update their company customizations" ON public.company_customizations;

CREATE POLICY "Company customizations strict isolation" ON public.company_customizations
FOR ALL USING (
  get_user_company_id() IS NOT NULL 
  AND company_id = get_user_company_id()
  AND company_id != (SELECT id FROM companies WHERE name = 'iTakecare' LIMIT 1)
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND company_id = get_user_company_id()
);

-- 5.4 Clients - renforcer l'isolation
DROP POLICY IF EXISTS "Clients strict company isolation" ON public.clients;
CREATE POLICY "Clients strict company isolation" ON public.clients
FOR ALL USING (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR user_id = auth.uid()
  )
  AND company_id != (SELECT id FROM companies WHERE name = 'iTakecare' LIMIT 1)
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND company_id = get_user_company_id()
);

-- 6. NETTOYER L'UTILISATEUR PROBLÉMATIQUE EXISTANT
-- Corriger l'utilisateur mistergi118+danlizz@gmail.com
SELECT fix_user_without_profile('mistergi118+danlizz@gmail.com');

-- 7. AJOUTER RLS SUR LA TABLE MODULES
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules are publicly readable" ON public.modules
FOR SELECT USING (true);

CREATE POLICY "Only admins can modify modules" ON public.modules
FOR ALL USING (is_admin_optimized()) 
WITH CHECK (is_admin_optimized());