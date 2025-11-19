-- Ajout des colonnes pour la fonctionnalité "Produits à déterminer"
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS products_to_be_determined BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(10, 2);

-- Ajout de commentaires pour la documentation
COMMENT ON COLUMN offers.products_to_be_determined IS 'Indique si l''offre est créée sans produits spécifiques pour scorer le client d''abord';
COMMENT ON COLUMN offers.estimated_budget IS 'Budget estimé en euros quand products_to_be_determined est true';

-- Créer un index pour améliorer les performances des requêtes filtrant par ce flag
CREATE INDEX IF NOT EXISTS idx_offers_products_tbd ON offers(products_to_be_determined) WHERE products_to_be_determined = true;