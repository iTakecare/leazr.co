
-- Supprimer les anciennes politiques conflictuelles restantes
DROP POLICY IF EXISTS "offer_equipment_attributes_access" ON offer_equipment_attributes;
DROP POLICY IF EXISTS "offer_equipment_specifications_access" ON offer_equipment_specifications;

-- Vérifier qu'il n'y a pas d'autres politiques conflictuelles
DROP POLICY IF EXISTS "ambassadors_can_view_offer_equipment_attributes" ON offer_equipment_attributes;
DROP POLICY IF EXISTS "admins_can_view_all_offer_equipment_attributes" ON offer_equipment_attributes;
DROP POLICY IF EXISTS "ambassadors_can_view_offer_equipment_specifications" ON offer_equipment_specifications;
DROP POLICY IF EXISTS "admins_can_view_all_offer_equipment_specifications" ON offer_equipment_specifications;
