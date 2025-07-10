-- PHASE 2: SUPPRESSION DE LA VUE DE SÉCURITÉ PROBLÉMATIQUE
-- La vue company_data_isolation_check pose un risque de sécurité car elle utilise SECURITY DEFINER
-- et peut contourner les politiques RLS. Elle n'est pas utilisée dans l'application.

-- Supprimer la vue company_data_isolation_check
DROP VIEW IF EXISTS public.company_data_isolation_check;