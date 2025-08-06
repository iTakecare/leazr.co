-- Créer le bucket Client Logos pour les logos des clients
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Client Logos',
  'Client Logos', 
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Créer les politiques de sécurité pour le bucket Client Logos
-- Politique pour la lecture publique
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Client Logos Public Read',
  'true',
  'Client Logos',
  ARRAY['SELECT']
) ON CONFLICT (name, bucket_id) DO NOTHING;

-- Politique pour l'upload par les utilisateurs authentifiés
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Client Logos Authenticated Upload',
  'auth.uid() IS NOT NULL',
  'Client Logos',
  ARRAY['INSERT']
) ON CONFLICT (name, bucket_id) DO NOTHING;

-- Politique pour la mise à jour par les utilisateurs authentifiés
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Client Logos Authenticated Update',
  'auth.uid() IS NOT NULL',
  'Client Logos',
  ARRAY['UPDATE']
) ON CONFLICT (name, bucket_id) DO NOTHING;

-- Politique pour la suppression par les utilisateurs authentifiés
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Client Logos Authenticated Delete',
  'auth.uid() IS NOT NULL',
  'Client Logos',
  ARRAY['DELETE']
) ON CONFLICT (name, bucket_id) DO NOTHING;