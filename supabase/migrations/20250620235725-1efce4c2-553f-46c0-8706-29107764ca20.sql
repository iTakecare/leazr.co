
-- Activer RLS sur les tables si pas déjà fait
ALTER TABLE public.ambassador_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes pour les ambassadeurs
DROP POLICY IF EXISTS "ambassadors_can_view_their_clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "ambassadors_can_view_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_can_create_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_can_update_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_can_delete_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_can_view_own_profile" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_can_update_own_profile" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassadors can manage their client relationships" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can view their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can create clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can update their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can delete their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Ambassadors can view their own profile" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassadors can update their own profile" ON public.ambassadors;
DROP POLICY IF EXISTS "Allow authenticated users to view companies" ON public.companies;

-- Ajouter les colonnes manquantes à la table companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS accent_color text,
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS custom_domain text;

-- Créer les nouvelles politiques pour ambassador_clients
CREATE POLICY "Ambassador client relationships access" 
  ON public.ambassador_clients 
  FOR ALL 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

-- Créer les politiques pour clients (ambassadeurs)
CREATE POLICY "Ambassador client access" 
  ON public.clients 
  FOR SELECT 
  USING (
    id IN (
      SELECT ac.client_id 
      FROM public.ambassador_clients ac
      JOIN public.ambassadors a ON ac.ambassador_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Ambassador client creation" 
  ON public.clients 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Ambassador client updates" 
  ON public.clients 
  FOR UPDATE 
  USING (
    id IN (
      SELECT ac.client_id 
      FROM public.ambassador_clients ac
      JOIN public.ambassadors a ON ac.ambassador_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Ambassador client deletion" 
  ON public.clients 
  FOR DELETE 
  USING (
    id IN (
      SELECT ac.client_id 
      FROM public.ambassador_clients ac
      JOIN public.ambassadors a ON ac.ambassador_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Créer les politiques pour ambassadors
CREATE POLICY "Ambassador profile access" 
  ON public.ambassadors 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Ambassador profile updates" 
  ON public.ambassadors 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Permettre l'accès à la table companies pour le branding
CREATE POLICY "Company branding access" 
  ON public.companies 
  FOR SELECT 
  TO authenticated 
  USING (true);
