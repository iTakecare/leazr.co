-- Ajouter le champ logo_url à la table clients
ALTER TABLE public.clients 
ADD COLUMN logo_url TEXT;

-- Créer le bucket pour les logos clients
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'Client Logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour accès public en lecture
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES ('Public read access for client logos', 'true', 'client-logos', '{SELECT}')
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Policies pour upload/update par les utilisateurs authentifiés de la même entreprise
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Company users can upload client logos',
  'auth.uid() IS NOT NULL AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.clients c 
    WHERE c.company_id = get_user_company_id()
  )',
  'client-logos',
  '{INSERT, UPDATE}'
)
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Policies pour suppression par les utilisateurs authentifiés de la même entreprise
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Company users can delete client logos',
  'auth.uid() IS NOT NULL AND (storage.foldername(name))[1] IN (
    SELECT c.id::text FROM public.clients c 
    WHERE c.company_id = get_user_company_id()
  )',
  'client-logos',
  '{DELETE}'
)
ON CONFLICT (name, bucket_id) DO NOTHING;