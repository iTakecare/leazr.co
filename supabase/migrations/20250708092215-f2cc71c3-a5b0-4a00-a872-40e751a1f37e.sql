-- Corriger les politiques RLS pour permettre la création d'entreprises pendant l'inscription

-- Supprimer l'ancienne politique restrictive sur companies
DROP POLICY IF EXISTS "companies_admin_access" ON public.companies;

-- Créer une nouvelle politique pour permettre l'insertion pendant l'inscription
CREATE POLICY "Allow company creation during signup" 
ON public.companies 
FOR INSERT 
WITH CHECK (true);

-- Créer une politique pour permettre aux admins de voir leur entreprise
CREATE POLICY "Company admin can view own company" 
ON public.companies 
FOR SELECT 
USING (id = get_user_company_id() OR is_admin_optimized());

-- Créer une politique pour permettre aux admins de modifier leur entreprise
CREATE POLICY "Company admin can update own company" 
ON public.companies 
FOR UPDATE 
USING (id = get_user_company_id() OR is_admin_optimized());

-- Ajouter une table modules si elle n'existe pas avec la bonne structure
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_core BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insérer les modules par défaut
INSERT INTO public.modules (slug, name, description, is_core) VALUES
('calculator', 'Calculateur Leasing', 'Calculs automatisés de leasing', true),
('catalog', 'Catalogue Produits', 'Gestion du catalogue produits', true),
('crm', 'CRM Client', 'Gestion de la relation client', true),
('ai_assistant', 'Assistant IA', 'Assistant intelligent pour les tâches', false),
('fleet_generator', 'Générateur de Parc', 'Génération automatique de parcs', false),
('contracts', 'Contrats', 'Gestion des contrats', false),
('support', 'SAV & Support', 'Support client et SAV', false)
ON CONFLICT (slug) DO NOTHING;

-- Corriger la table company_modules pour utiliser module_id
ALTER TABLE public.company_modules 
DROP COLUMN IF EXISTS module_slug CASCADE;

ALTER TABLE public.company_modules 
ADD COLUMN IF NOT EXISTS module_slug TEXT;

-- Ajouter une contrainte pour s'assurer qu'au moins un des deux existe
ALTER TABLE public.company_modules 
ADD CONSTRAINT company_modules_module_reference_check 
CHECK (module_id IS NOT NULL OR module_slug IS NOT NULL);

-- Politique RLS pour modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules are publicly readable" 
ON public.modules 
FOR SELECT 
USING (true);