-- Table pour stocker les événements de paiement Mollie
CREATE TABLE IF NOT EXISTS public.mollie_payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_mollie_payment_events_contract ON public.mollie_payment_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_mollie_payment_events_payment ON public.mollie_payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_mollie_payment_events_status ON public.mollie_payment_events(status);

-- RLS
ALTER TABLE public.mollie_payment_events ENABLE ROW LEVEL SECURITY;

-- Politique pour les admins de la company
CREATE POLICY "Company admins can view mollie events" 
ON public.mollie_payment_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.company_id = mollie_payment_events.company_id
  )
);

-- Ajouter les colonnes Mollie sur la table contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT,
ADD COLUMN IF NOT EXISTS mollie_mandate_id TEXT,
ADD COLUMN IF NOT EXISTS mollie_mandate_status TEXT,
ADD COLUMN IF NOT EXISTS mollie_subscription_id TEXT;