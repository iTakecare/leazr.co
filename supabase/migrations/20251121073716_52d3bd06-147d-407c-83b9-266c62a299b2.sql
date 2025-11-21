-- Migration: Suppression complète du système de types de catégories
-- Ce changement supprime les tables de compatibilités et simplifie le système de catégories

-- 1. Supprimer les tables de liens et compatibilités
DROP TABLE IF EXISTS category_specific_links CASCADE;
DROP TABLE IF EXISTS category_type_compatibilities CASCADE;
DROP TABLE IF EXISTS category_types CASCADE;

-- 2. Supprimer la colonne type de la table categories (remplacer par texte simple si nécessaire)
ALTER TABLE categories DROP COLUMN IF EXISTS type CASCADE;

-- 3. Nettoyer la table products si elle a une référence à category_type_id
ALTER TABLE products DROP COLUMN IF EXISTS category_type_id CASCADE;