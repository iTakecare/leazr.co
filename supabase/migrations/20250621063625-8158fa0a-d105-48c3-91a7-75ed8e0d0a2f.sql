
-- Diagnostic et correction complète des politiques RLS pour ambassador_clients

-- 1. Désactiver temporairement RLS pour nettoyer
ALTER TABLE public.ambassador_clients DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Ambassador clients view policy" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassador clients insert policy" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassador clients delete policy" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can view their own clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can insert their own clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can delete their client relationships" ON public.ambassador_clients;

-- 3. Réactiver RLS
ALTER TABLE public.ambassador_clients ENABLE ROW LEVEL SECURITY;

-- 4. Créer des politiques très simples sans sous-requêtes complexes
CREATE POLICY "ambassador_clients_select_policy" 
  ON public.ambassador_clients 
  FOR SELECT 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ambassador_clients_insert_policy" 
  ON public.ambassador_clients 
  FOR INSERT 
  WITH CHECK (
    ambassador_id IN (
      SELECT id FROM public.ambassadors 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ambassador_clients_delete_policy" 
  ON public.ambassador_clients 
  FOR DELETE 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors 
      WHERE user_id = auth.uid()
    )
  );

-- 5. Vérifier et corriger les politiques sur ambassadors aussi
ALTER TABLE public.ambassadors DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ambassador profile view policy" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassador profile update policy" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassadors can view their own profile" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassadors can update their own profile" ON public.ambassadors;

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ambassadors_select_policy" 
  ON public.ambassadors 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "ambassadors_update_policy" 
  ON public.ambassadors 
  FOR UPDATE 
  USING (user_id = auth.uid());
