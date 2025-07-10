
-- Protection permanente des données iTakecare contre la suppression automatique
-- Modifier les fonctions de nettoyage pour exclure complètement iTakecare

-- Fonction de nettoyage mise à jour pour protéger iTakecare
CREATE OR REPLACE FUNCTION public.cleanup_company_data_isolation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_company_id uuid;
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  -- Récupérer l'ID de l'entreprise de l'utilisateur actuel
  current_company_id := get_user_company_id();
  
  -- Si l'utilisateur n'a pas d'entreprise, ne rien faire
  IF current_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- PROTECTION ABSOLUE : Ne jamais toucher aux données d'iTakecare
  IF current_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- Pour toutes les autres entreprises : Ne rien nettoyer
  -- Le nettoyage automatique est désormais désactivé pour éviter les suppressions accidentelles
  
  RETURN true;
END;
$function$;

-- Fonction de nettoyage complet mise à jour pour protéger iTakecare
CREATE OR REPLACE FUNCTION public.complete_data_isolation_cleanup()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_company_id uuid;
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  -- Récupérer l'ID de l'entreprise de l'utilisateur actuel
  current_company_id := get_user_company_id();
  
  -- Si l'utilisateur n'a pas d'entreprise, ne rien faire
  IF current_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- PROTECTION ABSOLUE : Ne jamais toucher aux données d'iTakecare
  IF current_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- Pour toutes les autres entreprises : Nettoyage désactivé
  -- Plus de suppression automatique pour éviter les pertes de données
  
  RETURN true;
END;
$function$;

-- Fonction de nettoyage global mise à jour pour protéger iTakecare
CREATE OR REPLACE FUNCTION public.immediate_global_cleanup()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- PROTECTION ABSOLUE : Plus de nettoyage global automatique
  -- Cette fonction est désormais désactivée pour protéger toutes les données
  
  RETURN 'Nettoyage global désactivé pour protéger les données iTakecare et éviter les suppressions accidentelles';
END;
$function$;
