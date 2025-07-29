-- Create the platform-assets bucket for Leazr logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-assets',
  'Platform Assets',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create policies for platform-assets bucket
INSERT INTO storage.policies (name, definition, bucket_id, operations)
VALUES 
  ('Public read access for platform assets', 'true', 'platform-assets', '{SELECT}'),
  ('Admin upload access for platform assets', 'is_saas_admin()', 'platform-assets', '{INSERT, UPDATE, DELETE}');