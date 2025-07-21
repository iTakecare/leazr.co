
-- Ajouter la colonne slug à la table companies pour les URLs personnalisées
ALTER TABLE public.companies ADD COLUMN slug text UNIQUE;

-- Créer un index sur la colonne slug pour améliorer les performances
CREATE INDEX idx_companies_slug ON public.companies(slug);

-- Fonction pour générer un slug unique basé sur le nom de l'entreprise
CREATE OR REPLACE FUNCTION public.generate_company_slug(company_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Nettoyer le nom de l'entreprise pour créer un slug valide
  base_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  -- Limiter à 50 caractères maximum
  base_slug := left(base_slug, 50);
  
  -- Si le nom est vide après nettoyage, utiliser un nom par défaut
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'company';
  END IF;
  
  -- Vérifier l'unicité et ajouter un numéro si nécessaire
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$function$;

-- Fonction pour mettre à jour automatiquement le slug lors de la création d'une entreprise
CREATE OR REPLACE FUNCTION public.auto_generate_company_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Générer un slug automatiquement si pas fourni
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_company_slug(NEW.name);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger pour générer automatiquement le slug
CREATE TRIGGER trigger_auto_generate_company_slug
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_company_slug();

-- Mettre à jour les entreprises existantes avec des slugs
UPDATE public.companies 
SET slug = public.generate_company_slug(name)
WHERE slug IS NULL;

-- Fonction pour trouver une entreprise par son slug
CREATE OR REPLACE FUNCTION public.get_company_by_slug(company_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.logo_url,
    c.primary_color,
    c.secondary_color,
    c.accent_color
  FROM public.companies c
  WHERE c.slug = company_slug
  AND c.is_active = true
  LIMIT 1;
END;
$function$;
