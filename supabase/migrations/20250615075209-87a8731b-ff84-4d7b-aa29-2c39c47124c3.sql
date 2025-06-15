-- Créer un bucket de stockage pour les assets des entreprises
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'Company Assets', true)
ON CONFLICT (id) DO NOTHING;