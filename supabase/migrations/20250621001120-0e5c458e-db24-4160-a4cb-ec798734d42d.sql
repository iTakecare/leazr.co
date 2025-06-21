
-- Corriger les politiques RLS pour éviter la récursion infinie
-- Supprimer toutes les politiques existantes sur la table profiles
DROP POLICY IF EXISTS "profile_access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Créer des politiques simples sans récursion
-- Permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Permettre l'insertion de nouveaux profils (pour les nouveaux utilisateurs)
CREATE POLICY "Allow profile creation" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Corriger les politiques pour les ambassadeurs
DROP POLICY IF EXISTS "ambassadors_can_view_own_profile" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_can_update_own_profile" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_can_view_their_clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "ambassadors_can_view_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_can_create_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_can_update_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_can_delete_assigned_clients" ON public.clients;

-- Politiques pour ambassadors
CREATE POLICY "Ambassadors can view own profile" ON public.ambassadors
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Ambassadors can update own profile" ON public.ambassadors
FOR UPDATE USING (user_id = auth.uid());

-- Politiques pour ambassador_clients
CREATE POLICY "Ambassadors can view their client links" ON public.ambassador_clients
FOR SELECT USING (
  ambassador_id IN (
    SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Ambassadors can create client links" ON public.ambassador_clients
FOR INSERT WITH CHECK (
  ambassador_id IN (
    SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Ambassadors can delete their client links" ON public.ambassador_clients
FOR DELETE USING (
  ambassador_id IN (
    SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
  )
);

-- Politiques pour clients (permettre aux ambassadeurs de voir leurs clients assignés)
CREATE POLICY "Ambassadors can view their assigned clients" ON public.clients
FOR SELECT USING (
  id IN (
    SELECT ac.client_id 
    FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Permettre aux ambassadeurs de créer des clients
CREATE POLICY "Ambassadors can create clients" ON public.clients
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ambassadors WHERE user_id = auth.uid()
  )
);

-- Permettre aux ambassadeurs de mettre à jour leurs clients assignés
CREATE POLICY "Ambassadors can update their assigned clients" ON public.clients
FOR UPDATE USING (
  id IN (
    SELECT ac.client_id 
    FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE a.user_id = auth.uid()
  )
);
