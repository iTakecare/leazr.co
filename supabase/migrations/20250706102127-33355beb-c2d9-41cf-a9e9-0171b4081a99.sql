-- Créer le bucket pour les templates PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-templates', 'PDF Templates', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques d'accès pour les templates PDF
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Company can manage their templates',
  '(bucket_id = ''pdf-templates'') AND (auth.uid() IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN (''admin'', ''super_admin'')
    )
  )',
  'pdf-templates',
  '{SELECT,INSERT,UPDATE,DELETE}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'Public can view templates',
  '(bucket_id = ''pdf-templates'')',
  'pdf-templates',
  '{SELECT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;