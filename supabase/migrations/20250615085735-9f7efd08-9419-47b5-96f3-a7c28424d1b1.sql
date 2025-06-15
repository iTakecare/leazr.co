-- OPTIMISATION 1: Nettoyer les politiques RLS redondantes sur clients
-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Admin peut modifier tous les clients" ON public.clients;
DROP POLICY IF EXISTS "Admin peut voir tous les clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can see all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins have full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow ambassadors to create clients" ON public.clients;
DROP POLICY IF EXISTS "Allow ambassadors to view their linked clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public client insertion" ON public.clients;
DROP POLICY IF EXISTS "Allow public to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can delete their clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can see their clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can update their clients" ON public.clients;
DROP POLICY IF EXISTS "Autoriser les insertions publiques pour clients" ON public.clients;
DROP POLICY IF EXISTS "Enable public inserts to clients" ON public.clients;
DROP POLICY IF EXISTS "Partners can delete their clients" ON public.clients;
DROP POLICY IF EXISTS "Partners can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Partners can see their clients" ON public.clients;
DROP POLICY IF EXISTS "Partners can update their clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage clients from their company" ON public.clients;
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can only access their company data" ON public.clients;
DROP POLICY IF EXISTS "Users can only delete clients from their company" ON public.clients;
DROP POLICY IF EXISTS "Users can only insert clients in their company" ON public.clients;
DROP POLICY IF EXISTS "Users can only see clients from their company" ON public.clients;
DROP POLICY IF EXISTS "Users can only update clients from their company" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients from their company" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leurs propres clients" ON public.clients;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs propres clients" ON public.clients;

-- Activer RLS sur clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS simplifiées et optimisées pour clients
-- 1. Admin: accès total
CREATE POLICY "Admin full access to clients" ON public.clients
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. Multi-tenant: accès par entreprise
CREATE POLICY "Company members can manage their clients" ON public.clients
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);

-- 3. Insertion publique pour les demandes
CREATE POLICY "Allow public client requests" ON public.clients
FOR INSERT WITH CHECK (
  auth.role() = 'anon'
);