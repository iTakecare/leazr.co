-- Créer la table contract_workflow_logs pour l'historique des contrats
CREATE TABLE IF NOT EXISTS public.contract_workflow_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL,
  user_id UUID,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_contract_workflow_logs_contract 
    FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contract_workflow_logs_contract_id 
  ON public.contract_workflow_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_workflow_logs_created_at 
  ON public.contract_workflow_logs(created_at DESC);

-- Activer RLS
ALTER TABLE public.contract_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Créer une politique RLS pour permettre l'accès aux logs de contrats de la même entreprise
CREATE POLICY "contract_workflow_logs_company_access" 
ON public.contract_workflow_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_workflow_logs.contract_id
    AND (
      c.company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_contract_workflow_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contract_workflow_logs_updated_at
  BEFORE UPDATE ON public.contract_workflow_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contract_workflow_logs_updated_at();