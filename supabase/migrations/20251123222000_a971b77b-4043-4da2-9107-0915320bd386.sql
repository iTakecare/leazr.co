-- Ajouter la colonne variant_id pour stocker l'ID du variant de produit
ALTER TABLE offer_equipment 
ADD COLUMN IF NOT EXISTS variant_id UUID;

-- Ajouter une foreign key optionnelle vers product_variant_prices
ALTER TABLE offer_equipment
ADD CONSTRAINT fk_offer_equipment_variant
FOREIGN KEY (variant_id) 
REFERENCES product_variant_prices(id)
ON DELETE SET NULL;

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_offer_equipment_variant_id 
ON offer_equipment(variant_id);

-- Commentaire pour documentation
COMMENT ON COLUMN offer_equipment.variant_id IS 
'ID du variant de produit (product_variant_prices) pour identifier précisément la configuration du produit';