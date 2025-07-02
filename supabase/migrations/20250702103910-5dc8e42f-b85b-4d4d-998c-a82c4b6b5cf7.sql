-- Créer la table collaborators pour gérer l'assignation d'équipements
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'Collaborateur',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "collaborators_company_access" 
ON public.collaborators 
FOR ALL 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collaborators_client_id ON public.collaborators(client_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_is_primary ON public.collaborators(is_primary) WHERE is_primary = true;