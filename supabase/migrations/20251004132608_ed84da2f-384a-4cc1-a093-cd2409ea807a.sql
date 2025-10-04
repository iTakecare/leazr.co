-- Supprimer l'ancienne version courte de la fonction qui cause le conflit
DROP FUNCTION IF EXISTS public.insert_offer_equipment_secure(
  uuid, text, numeric, integer, numeric, numeric, text
);

-- Garder uniquement la version complète avec tous les paramètres de livraison