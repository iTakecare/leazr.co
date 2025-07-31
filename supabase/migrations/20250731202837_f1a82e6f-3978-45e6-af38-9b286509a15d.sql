-- Créer la table pour l'historique des activités des ambassadeurs
CREATE TABLE public.ambassador_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassador_id UUID NOT NULL,
  user_id UUID,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_ambassador_activity_logs_ambassador_id ON public.ambassador_activity_logs(ambassador_id);
CREATE INDEX idx_ambassador_activity_logs_created_at ON public.ambassador_activity_logs(created_at DESC);
CREATE INDEX idx_ambassador_activity_logs_action_type ON public.ambassador_activity_logs(action_type);

-- Activer RLS
ALTER TABLE public.ambassador_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy pour l'accès aux logs d'activité des ambassadeurs
CREATE POLICY "ambassador_activity_logs_company_access" 
ON public.ambassador_activity_logs 
FOR ALL 
USING (
  ambassador_id IN (
    SELECT a.id 
    FROM public.ambassadors a 
    WHERE a.company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Fonction pour logger automatiquement les activités
CREATE OR REPLACE FUNCTION public.log_ambassador_activity(
  p_ambassador_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.ambassador_activity_logs (
    ambassador_id,
    user_id,
    action_type,
    description,
    metadata
  ) VALUES (
    p_ambassador_id,
    COALESCE(p_user_id, auth.uid()),
    p_action_type,
    p_description,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;