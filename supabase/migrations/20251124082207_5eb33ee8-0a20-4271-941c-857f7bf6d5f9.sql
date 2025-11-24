-- Vérification des données existantes avec partner_offer
-- (Cette requête retournera 0 si aucun enregistrement n'existe)

-- Vérifier les workflows templates
DO $$
BEGIN
  -- Migrer les workflow_templates avec partner_offer vers client_request
  UPDATE workflow_templates 
  SET offer_type = 'client_request' 
  WHERE offer_type = 'partner_offer';
  
  RAISE NOTICE 'Workflows migrés: % templates', (SELECT count(*) FROM workflow_templates WHERE offer_type = 'client_request');
END $$;

-- Vérifier et migrer les offres
DO $$
BEGIN
  -- Migrer les offres avec partner_offer vers client_request
  UPDATE offers 
  SET type = 'client_request' 
  WHERE type = 'partner_offer';
  
  RAISE NOTICE 'Offres migrées: % offres', (SELECT count(*) FROM offers WHERE type = 'client_request');
END $$;

-- Supprimer l'ancienne contrainte
ALTER TABLE offers 
DROP CONSTRAINT IF EXISTS check_offer_type;

-- Recréer la contrainte sans 'partner_offer'
ALTER TABLE offers 
ADD CONSTRAINT check_offer_type 
CHECK (type = ANY (ARRAY[
  'ambassador_offer'::text,
  'offer'::text,
  'client_request'::text,
  'internal_offer'::text,
  'admin_offer'::text,
  'web_request'::text,
  'custom_pack_request'::text
]));