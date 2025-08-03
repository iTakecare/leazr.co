-- Create storage bucket for postal code import files
INSERT INTO storage.buckets (id, name, public)
VALUES ('postal-code-imports', 'Postal Code Import Files', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for postal code import files
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'SaaS Admin can upload postal code files',
  'is_saas_admin()',
  'postal-code-imports',
  '{INSERT, UPDATE, DELETE}'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES (
  'SaaS Admin can read postal code files',
  'is_saas_admin()',
  'postal-code-imports',
  '{SELECT}'
) ON CONFLICT (name, bucket_id) DO NOTHING;