-- Create storage bucket for postal code import files
INSERT INTO storage.buckets (id, name, public)
VALUES ('postal-code-imports', 'Postal Code Import Files', false)
ON CONFLICT (id) DO NOTHING;