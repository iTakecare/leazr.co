-- Créer des ambassadeurs pour ALizz SRL (company_id: b501f123-2c3f-4855-81d1-ceb32afb9ff0)
INSERT INTO public.ambassadors (
  name,
  email,
  phone,
  company_id,
  status,
  address,
  city,
  country,
  notes
) VALUES 
(
  'Marie Dupont',
  'marie.dupont@alizzsrl.be',
  '+32 2 123 45 67',
  'b501f123-2c3f-4855-81d1-ceb32afb9ff0',
  'active',
  'Rue de la Paix 123',
  'Bruxelles',
  'Belgique',
  'Ambassadrice principale ALizz SRL'
),
(
  'Jean Martin',
  'jean.martin@alizzsrl.be',
  '+32 2 234 56 78',
  'b501f123-2c3f-4855-81d1-ceb32afb9ff0',
  'active',
  'Avenue Louise 456',
  'Bruxelles',
  'Belgique',
  'Ambassadeur commercial ALizz SRL'
);