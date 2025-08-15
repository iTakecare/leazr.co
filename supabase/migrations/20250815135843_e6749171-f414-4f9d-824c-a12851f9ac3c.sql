-- Add missing modules to align with sidebar menu items
INSERT INTO public.modules (slug, name, description, is_core, price_starter, price_pro, price_business) VALUES
  ('offers', 'Offres', 'Gestion des offres commerciales et devis', false, 0, 0, 0),
  ('invoicing', 'Factures', 'Gestion de la facturation et des paiements', false, 15, 10, 5),
  ('chat', 'Chat Admin', 'Administration du chat client en temps réel', false, 10, 5, 0),
  ('equipment', 'Équipements', 'Gestion des équipements et du matériel', false, 20, 15, 10),
  ('public_catalog', 'Catalogue Public', 'Catalogue produits accessible aux clients', false, 5, 0, 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_starter = EXCLUDED.price_starter,
  price_pro = EXCLUDED.price_pro,
  price_business = EXCLUDED.price_business;