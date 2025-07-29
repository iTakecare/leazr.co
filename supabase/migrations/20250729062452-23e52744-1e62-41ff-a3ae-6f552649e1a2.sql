-- Create storage policies for platform-assets bucket

-- Policy to allow public read access
INSERT INTO storage.policies (name, definition, bucket_id, operations, check_definition)
VALUES (
  'Platform Assets Public Read',
  'true',
  'platform-assets',
  ARRAY['SELECT'],
  NULL
) ON CONFLICT (name, bucket_id) DO NOTHING;

-- Policy to allow admin upload/update/delete
INSERT INTO storage.policies (name, definition, bucket_id, operations, check_definition)
VALUES (
  'Platform Assets Admin Write',
  'is_saas_admin()',
  'platform-assets',
  ARRAY['INSERT', 'UPDATE', 'DELETE'],
  'is_saas_admin()'
) ON CONFLICT (name, bucket_id) DO NOTHING;