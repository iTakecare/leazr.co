-- Phase 1: Ajouter les politiques RLS pour l'isolation multi-tenant
-- Fonction utilitaire pour récupérer le company_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  SELECT company_id INTO user_company_id 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN user_company_id;
END;
$$;

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table clients
CREATE POLICY "Users can only see clients from their company" 
ON public.clients 
FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only insert clients in their company" 
ON public.clients 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can only update clients from their company" 
ON public.clients 
FOR UPDATE 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only delete clients from their company" 
ON public.clients 
FOR DELETE 
USING (company_id = public.get_user_company_id());

-- Politiques pour la table products
CREATE POLICY "Users can only see products from their company" 
ON public.products 
FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only insert products in their company" 
ON public.products 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can only update products from their company" 
ON public.products 
FOR UPDATE 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only delete products from their company" 
ON public.products 
FOR DELETE 
USING (company_id = public.get_user_company_id());

-- Politiques pour la table offers
CREATE POLICY "Users can only see offers from their company" 
ON public.offers 
FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only insert offers in their company" 
ON public.offers 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can only update offers from their company" 
ON public.offers 
FOR UPDATE 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only delete offers from their company" 
ON public.offers 
FOR DELETE 
USING (company_id = public.get_user_company_id());

-- Politiques pour la table contracts
CREATE POLICY "Users can only see contracts from their company" 
ON public.contracts 
FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only insert contracts in their company" 
ON public.contracts 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can only update contracts from their company" 
ON public.contracts 
FOR UPDATE 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only delete contracts from their company" 
ON public.contracts 
FOR DELETE 
USING (company_id = public.get_user_company_id());

-- Politiques pour la table ambassadors
CREATE POLICY "Users can only see ambassadors from their company" 
ON public.ambassadors 
FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only insert ambassadors in their company" 
ON public.ambassadors 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can only update ambassadors from their company" 
ON public.ambassadors 
FOR UPDATE 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only delete ambassadors from their company" 
ON public.ambassadors 
FOR DELETE 
USING (company_id = public.get_user_company_id());

-- Politiques pour la table partners
CREATE POLICY "Users can only see partners from their company" 
ON public.partners 
FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only insert partners in their company" 
ON public.partners 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can only update partners from their company" 
ON public.partners 
FOR UPDATE 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only delete partners from their company" 
ON public.partners 
FOR DELETE 
USING (company_id = public.get_user_company_id());

-- Politiques pour la table leasers
CREATE POLICY "Users can only see leasers from their company" 
ON public.leasers 
FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only insert leasers in their company" 
ON public.leasers 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can only update leasers from their company" 
ON public.leasers 
FOR UPDATE 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can only delete leasers from their company" 
ON public.leasers 
FOR DELETE 
USING (company_id = public.get_user_company_id());