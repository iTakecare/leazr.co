-- Corriger définitivement l'erreur "permission denied for table users"
-- 1. D'abord, supprimer tous les triggers problématiques qui accèdent à auth.users
DROP TRIGGER IF EXISTS ensure_company_isolation ON public.profiles;
DROP TRIGGER IF EXISTS validate_company_assignment_trigger ON public.profiles;

-- 2. Supprimer les fonctions qui accèdent à auth.users
DROP FUNCTION IF EXISTS public.ensure_proper_company_assignment();
DROP FUNCTION IF EXISTS public.validate_company_assignment();

-- 3. Créer une edge function sécurisée pour la création d'entreprise avec utilisateur
-- Cette fonction sera utilisée à la place du processus client actuel

-- 4. Corriger les politiques RLS qui utilisent auth.users directement
-- Remplacer les politiques qui accèdent à auth.users par des fonctions sécurisées

-- 4.1. Créer une fonction sécurisée pour obtenir l'email utilisateur
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.2. Mettre à jour la politique des entreprises pour éviter l'accès direct à auth.users
DROP POLICY IF EXISTS "Company strict isolation" ON public.companies;
CREATE POLICY "Company strict isolation" 
ON public.companies 
FOR ALL 
USING (
  id = get_user_company_id() 
  OR is_admin_optimized()
  OR (
    -- Permettre aux utilisateurs iTakecare de voir leur entreprise
    get_current_user_email() LIKE '%itakecare.be%'
    AND companies.name = 'iTakecare'
  )
);

-- 5. Créer un trigger simplifié pour la création automatique de profil
-- sans accès à auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer le profil utilisateur avec les métadonnées de base
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULL -- company_id sera défini par l'edge function
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Créer le trigger pour la création automatique de profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Corriger le trigger de liaison client
CREATE OR REPLACE FUNCTION public.link_user_to_client_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  client_record RECORD;
  user_email TEXT;
BEGIN
  -- Récupérer l'email via la fonction sécurisée
  user_email := get_current_user_email();
  
  -- Chercher un client avec cet email
  SELECT * INTO client_record 
  FROM public.clients 
  WHERE email = user_email 
    AND (user_id IS NULL OR user_id = NEW.id)
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE public.clients 
    SET 
      user_id = NEW.id,
      has_user_account = TRUE,
      user_account_created_at = NOW(),
      status = COALESCE(status, 'active')
    WHERE id = client_record.id;
    
    RAISE NOTICE 'Client % associé à l''utilisateur %', client_record.id, NEW.id;
  ELSE
    RAISE NOTICE 'Aucun client non associé trouvé pour l''email %', user_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Nettoyer les politiques problématiques avec auth.users
-- Supprimer et recréer les politiques qui accèdent directement à auth.users

-- Mise à jour des politiques admin_pending_requests
DROP POLICY IF EXISTS "admin_pending_requests_access" ON public.admin_pending_requests;
CREATE POLICY "admin_pending_requests_access" 
ON public.admin_pending_requests 
FOR ALL 
USING (is_admin_optimized());

-- Mise à jour des politiques ambassadors
DROP POLICY IF EXISTS "ambassadors_access" ON public.ambassadors;
CREATE POLICY "ambassadors_access" 
ON public.ambassadors 
FOR ALL 
USING (
  company_id = get_user_company_id() 
  OR is_admin_optimized()
);

-- Mise à jour des politiques error_logs
DROP POLICY IF EXISTS "error_logs_access" ON public.error_logs;
CREATE POLICY "error_logs_access" 
ON public.error_logs 
FOR ALL 
USING (is_admin_optimized());