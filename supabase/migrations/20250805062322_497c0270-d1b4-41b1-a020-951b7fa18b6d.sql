-- Create pdf-templates bucket with proper policies
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pdf-templates', 'PDF Templates', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Create policies for pdf-templates bucket
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'pdf_templates_authenticated_select',
  'auth.uid() IS NOT NULL',
  'pdf-templates',
  '{SELECT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'pdf_templates_authenticated_insert',
  'auth.uid() IS NOT NULL',
  'pdf-templates',
  '{INSERT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'pdf_templates_authenticated_update',
  'auth.uid() IS NOT NULL',
  'pdf-templates',
  '{UPDATE}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'pdf_templates_authenticated_delete',
  'auth.uid() IS NOT NULL',
  'pdf-templates',
  '{DELETE}'
) ON CONFLICT (name, bucket_id) DO NOTHING;