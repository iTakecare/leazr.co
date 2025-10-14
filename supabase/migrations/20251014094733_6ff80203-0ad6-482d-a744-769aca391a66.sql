-- Migration: Simplifier le système de génération PDF
-- Supprimer les anciennes tables et ajouter les champs design sur offers

-- Supprimer la table professional_pdf_templates si elle existe
DROP TABLE IF EXISTS professional_pdf_templates CASCADE;

-- Ajouter les champs de design PDF à la table offers
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS pdf_template_id TEXT DEFAULT 'classic-business',
ADD COLUMN IF NOT EXISTS pdf_customizations JSONB DEFAULT '{"showLogo": true, "showFooter": true}'::jsonb;