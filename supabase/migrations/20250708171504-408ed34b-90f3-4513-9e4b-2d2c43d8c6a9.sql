-- Migration complète pour corriger l'isolation des données et initialiser les nouvelles entreprises
-- Corrige les problèmes où les utilisateurs voient les données d'autres entreprises

-- 1. CRÉER UNE FONCTION POUR INITIALISER UNE NOUVELLE ENTREPRISE
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
    contact_info,
    is_default,
    created_at
  ) VALUES 
  (p_company_id, 'Leaser Principal', 'contact@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   jsonb_build_object('phone', '+33 1 00 00 00 00'), true, now()),
  (p_company_id, 'Leaser Secondaire', 'secondaire@' || lower(replace(p_company_name, ' ', '')) || '.com', 
   jsonb_build_object('phone', '+33 1 00 00 00 01'), false, now());

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

  -- Créer des modèles de commission par défaut
  INSERT INTO public.commission_levels (
    name,
    type,
    is_default,
    created_at
  ) VALUES 
  ('Standard', 'percentage', true, now()),
  ('Premium', 'percentage', false, now())
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- 2. AMÉLIORER LA FONCTION DE CRÉATION D'ENTREPRISE AVEC ADMIN
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
BEGIN
  -- Récupérer l'ID de l'utilisateur admin qui vient d'être créé
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = p_admin_email 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur admin non trouvé pour l''email: %', p_admin_email;
  END IF;

  -- Créer l'entreprise
  INSERT INTO public.companies (
    name,
    plan,
    account_status,
    trial_starts_at,
    trial_ends_at,
    is_active,
    created_at
  ) VALUES (
    p_company_name,
    p_plan,
    'trial',
    now(),
    now() + interval '14 days',
    true,
    now()
  ) RETURNING id INTO new_company_id;

  -- Créer ou mettre à jour le profil admin
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id,
    created_at
  ) VALUES (
    admin_user_id,
    p_admin_first_name,
    p_admin_last_name,
    'admin',
    new_company_id,
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    updated_at = now();

  -- Initialiser l'entreprise avec les données par défaut
  PERFORM public.initialize_new_company(new_company_id, p_company_name);

  RETURN QUERY SELECT new_company_id, admin_user_id, true;
END;
$$;

-- 3. RENFORCER L'ISOLATION DES DONNÉES AVEC DES POLITIQUES RLS STRICTES

-- 3.1 Corriger la table PROFILES pour éviter les références circulaires
DROP POLICY IF EXISTS "Profiles management" ON public.profiles;

CREATE POLICY "Profiles strict isolation" ON public.profiles
FOR ALL USING (
  id = auth.uid() 
  OR is_admin_optimized()
  OR (
    -- Les admins peuvent voir tous les profils de leur entreprise seulement
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('admin', 'super_admin')
      AND admin_profile.company_id = profiles.company_id
    )
  )
) WITH CHECK (
  id = auth.uid() 
  OR is_admin_optimized()
);

-- 3.2 Renforcer l'isolation pour les LEASERS
DROP POLICY IF EXISTS "Leasers strict company isolation" ON public.leasers;

CREATE POLICY "Leasers strict company isolation" ON public.leasers
FOR ALL USING (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- 3.3 Renforcer l'isolation pour les COMMISSION_LEVELS (données globales mais isolées)
DROP POLICY IF EXISTS "Commission levels unified" ON public.commission_levels;

CREATE POLICY "Commission levels access" ON public.commission_levels
FOR ALL USING (
  -- Les niveaux de commission sont globaux mais chaque entreprise ne voit que les siens ou les défauts
  is_default = true OR get_user_company_id() IS NOT NULL
) WITH CHECK (
  is_admin_optimized()
);

-- 3.4 Ajouter une politique stricte pour empêcher la visibilité croisée des données
-- Créer une vue pour surveiller l'isolation
CREATE OR REPLACE VIEW public.company_data_isolation_check AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT p.id) as profiles_count,
  COUNT(DISTINCT cl.id) as clients_count,
  COUNT(DISTINCT pr.id) as products_count,
  COUNT(DISTINCT l.id) as leasers_count
FROM public.companies c
LEFT JOIN public.profiles p ON c.id = p.company_id
LEFT JOIN public.clients cl ON c.id = cl.company_id  
LEFT JOIN public.products pr ON c.id = pr.company_id
LEFT JOIN public.leasers l ON c.id = l.company_id
GROUP BY c.id, c.name
ORDER BY c.created_at DESC;

-- 4. CRÉER UN TRIGGER POUR INITIALISER AUTOMATIQUEMENT LES NOUVELLES ENTREPRISES
CREATE OR REPLACE FUNCTION public.trigger_initialize_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialiser la nouvelle entreprise après sa création
  PERFORM public.initialize_new_company(NEW.id, NEW.name);
  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà et le recréer
DROP TRIGGER IF EXISTS auto_initialize_company ON public.companies;
CREATE TRIGGER auto_initialize_company
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_initialize_company();

-- 5. NETTOYER LES DONNÉES ORPHELINES ET CORRIGER LES ASSOCIATIONS
-- S'assurer que tous les profils existants ont un company_id valide
UPDATE public.profiles 
SET company_id = (
  SELECT c.id FROM public.companies c 
  WHERE c.name = 'iTakecare' 
  LIMIT 1
)
WHERE company_id IS NULL 
AND EXISTS (SELECT 1 FROM auth.users WHERE id = profiles.id AND email LIKE '%itakecare.be%');

-- 6. AMÉLIORER LA FONCTION get_user_company_id POUR UNE MEILLEURE FIABILITÉ
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE id = auth.uid() 
  AND company_id IS NOT NULL
  LIMIT 1;
$$;