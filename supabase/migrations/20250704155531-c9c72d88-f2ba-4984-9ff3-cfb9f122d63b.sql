-- Vérifier si le bucket leaser-logos existe
SELECT id, name, public FROM storage.buckets WHERE id = 'leaser-logos';

-- Si le bucket n'existe pas, le créer
INSERT INTO storage.buckets (id, name, public)
VALUES ('leaser-logos', 'leaser-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Créer les politiques pour permettre l'accès public
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'leaser_logos_public_select',
  'TRUE',
  'leaser-logos',
  '{SELECT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'leaser_logos_public_insert',
  'TRUE',
  'leaser-logos',
  '{INSERT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;