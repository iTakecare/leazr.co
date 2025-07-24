-- Phase 1: Ajouter les champs manquants à la table products
-- Ajouter woocommerce_id pour stocker l'ID du produit WooCommerce
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS woocommerce_id text;

-- Ajouter slug pour stocker le slug du produit WooCommerce  
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

-- Ajouter un index unique pour woocommerce_id pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS products_woocommerce_id_idx ON public.products(woocommerce_id) WHERE woocommerce_id IS NOT NULL;

-- Ajouter un index pour slug pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS products_slug_idx ON public.products(slug) WHERE slug IS NOT NULL;