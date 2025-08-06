-- Supprimer les anciennes politiques s'il y en a et créer les nouvelles
DELETE FROM storage.policies WHERE bucket_id = 'Client Logos';

-- Créer les politiques de sécurité pour le bucket Client Logos
-- Politique pour permettre toutes les opérations (lecture, écriture, suppression) aux utilisateurs authentifiés
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Client Logos All Operations',
  'auth.uid() IS NOT NULL',
  'Client Logos',
  ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
);

-- Politique pour l'accès public en lecture
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Client Logos Public Read Access',
  'true',
  'Client Logos',
  ARRAY['SELECT']
);