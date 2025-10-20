-- Ajouter la colonne business_sector à la table offers
ALTER TABLE offers 
ADD COLUMN business_sector TEXT;

-- Créer un index pour optimiser les recherches
CREATE INDEX idx_offers_business_sector ON offers(business_sector);

-- Pré-remplir avec les secteurs des clients existants
UPDATE offers o
SET business_sector = c.business_sector
FROM clients c
WHERE o.client_id = c.id 
AND c.business_sector IS NOT NULL
AND o.business_sector IS NULL;