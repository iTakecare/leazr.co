
-- Create translations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'common',
  fr TEXT NOT NULL,
  en TEXT DEFAULT '',
  nl TEXT DEFAULT '',
  de TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(section, key)
);

-- Add basic translations
INSERT INTO public.translations (section, key, fr, en, nl, de) VALUES
-- Navigation
('navigation', 'home', 'Accueil', 'Home', 'Home', 'Startseite'),
('navigation', 'catalog', 'Catalogue', 'Catalog', 'Catalogus', 'Katalog'),
('navigation', 'management_software', 'Logiciel de gestion', 'Management Software', 'Beheersoftware', 'Management-Software'),
('navigation', 'blog', 'Blog', 'Blog', 'Blog', 'Blog'),
('navigation', 'contact', 'Contact', 'Contact', 'Contact', 'Kontakt'),
('navigation', 'my_hub', 'Mon Hub', 'My Hub', 'Mijn Hub', 'Mein Hub'),
('navigation', 'login', 'Se connecter', 'Log in', 'Inloggen', 'Anmelden'),
('navigation', 'logout', 'Se déconnecter', 'Log out', 'Uitloggen', 'Abmelden'),
('navigation', 'about', 'À propos', 'About', 'Over ons', 'Über uns'),
('navigation', 'solutions', 'Solutions', 'Solutions', 'Oplossingen', 'Lösungen'),
('navigation', 'services', 'Services', 'Services', 'Diensten', 'Dienstleistungen'),
('navigation', 'sustainability', 'Durabilité', 'Sustainability', 'Duurzaamheid', 'Nachhaltigkeit'),
('navigation', 'open_menu', 'Ouvrir le menu', 'Open menu', 'Menu openen', 'Menü öffnen'),
('navigation', 'close_menu', 'Fermer le menu', 'Close menu', 'Menu sluiten', 'Menü schließen'),

-- Solutions
('solutions', 'equipment_rental', 'Location d''équipement', 'Equipment Rental', 'Verhuur van apparatuur', 'Geräte-Vermietung'),
('solutions', 'equipment_rental_desc', 'Matériel informatique haute performance en location flexible', 'High-performance computer equipment with flexible rental options', 'Hoogwaardige computerapparatuur met flexibele huurmogelijkheden', 'Hochleistungs-Computerausrüstung mit flexiblen Mietoptionen'),
('solutions', 'fleet_management', 'Gestion de parc', 'Fleet Management', 'Vlootbeheer', 'Flottenverwaltung'),
('solutions', 'fleet_management_desc', 'Solutions complètes pour gérer votre infrastructure informatique', 'Complete solutions to manage your IT infrastructure', 'Complete oplossingen voor het beheer van uw IT-infrastructuur', 'Komplettlösungen zur Verwaltung Ihrer IT-Infrastruktur'),
('solutions', 'cloud_services', 'Services cloud', 'Cloud Services', 'Cloud diensten', 'Cloud-Dienste'),
('solutions', 'cloud_services_desc', 'Infrastructure cloud sécurisée et évolutive', 'Secure and scalable cloud infrastructure', 'Veilige en schaalbare cloud-infrastructuur', 'Sichere und skalierbare Cloud-Infrastruktur'),
('solutions', 'refurbishing', 'Reconditionnement', 'Refurbishing', 'Refurbishing', 'Wiederaufbereitung'),
('solutions', 'refurbishing_desc', 'Équipements reconditionnés et certifiés écologiques', 'Refurbished and eco-certified equipment', 'Gereviseerde en ecologisch gecertificeerde apparatuur', 'Überholte und umweltzertifizierte Geräte'),

-- Services
('services', 'for_businesses', 'Pour entreprises', 'For Businesses', 'Voor bedrijven', 'Für Unternehmen'),
('services', 'for_businesses_desc', 'Solutions adaptées aux besoins des entreprises', 'Solutions tailored to business needs', 'Oplossingen aangepast aan de behoeften van bedrijven', 'Lösungen, die auf die Bedürfnisse von Unternehmen zugeschnitten sind'),
('services', 'for_professionals', 'Pour professionnels', 'For Professionals', 'Voor professionals', 'Für Fachleute'),
('services', 'for_professionals_desc', 'Offres spéciales pour indépendants et professionnels', 'Special offers for freelancers and professionals', 'Speciale aanbiedingen voor freelancers en professionals', 'Spezielle Angebote für Freiberufler und Fachleute'),
('services', 'itakecare_hub', 'Hub iTakecare', 'iTakecare Hub', 'iTakecare Hub', 'iTakecare Hub'),
('services', 'itakecare_hub_desc', 'Votre espace personnel de gestion informatique', 'Your personal IT management space', 'Uw persoonlijke IT-managementruimte', 'Ihr persönlicher IT-Management-Bereich'),
('services', 'technical_support', 'Support technique', 'Technical Support', 'Technische ondersteuning', 'Technischer Support'),
('services', 'technical_support_desc', 'Assistance technique dédiée et réactive', 'Dedicated and responsive technical assistance', 'Toegewijde en responsieve technische ondersteuning', 'Engagierte und reaktionsschnelle technische Unterstützung'),
('services', 'free', 'Gratuit', 'Free', 'Gratis', 'Kostenlos'),

-- Sustainability
('sustainability', 'our_commitment', 'Notre engagement', 'Our Commitment', 'Onze toezegging', 'Unsere Verpflichtung'),
('sustainability', 'our_commitment_desc', 'Notre mission pour un numérique responsable', 'Our mission for responsible digital practices', 'Onze missie voor verantwoorde digitale praktijken', 'Unsere Mission für verantwortungsvolle digitale Praktiken'),
('sustainability', 'circular_economy', 'Économie circulaire', 'Circular Economy', 'Circulaire economie', 'Kreislaufwirtschaft'),
('sustainability', 'circular_economy_desc', 'Comment nous contribuons à l''économie circulaire', 'How we contribute to the circular economy', 'Hoe we bijdragen aan de circulaire economie', 'Wie wir zur Kreislaufwirtschaft beitragen'),
('sustainability', 'environmental_impact', 'Impact environnemental', 'Environmental Impact', 'Milieu-impact', 'Umweltauswirkungen'),
('sustainability', 'environmental_impact_desc', 'Nos actions pour réduire l''empreinte environnementale', 'Our actions to reduce the environmental footprint', 'Onze acties om de ecologische voetafdruk te verminderen', 'Unsere Maßnahmen zur Reduzierung des ökologischen Fußabdrucks'),

-- Common
('common', 'search', 'Rechercher', 'Search', 'Zoeken', 'Suchen'),
('common', 'add', 'Ajouter', 'Add', 'Toevoegen', 'Hinzufügen'),
('common', 'edit', 'Modifier', 'Edit', 'Bewerken', 'Bearbeiten'),
('common', 'delete', 'Supprimer', 'Delete', 'Verwijderen', 'Löschen'),
('common', 'cancel', 'Annuler', 'Cancel', 'Annuleren', 'Abbrechen'),
('common', 'save', 'Enregistrer', 'Save', 'Opslaan', 'Speichern'),
('common', 'confirm', 'Confirmer', 'Confirm', 'Bevestigen', 'Bestätigen'),
('common', 'loading', 'Chargement...', 'Loading...', 'Laden...', 'Wird geladen...'),
('common', 'error', 'Erreur', 'Error', 'Fout', 'Fehler'),
('common', 'success', 'Succès', 'Success', 'Succes', 'Erfolg')

ON CONFLICT (section, key)
DO UPDATE SET
  fr = EXCLUDED.fr,
  en = EXCLUDED.en,
  nl = EXCLUDED.nl,
  de = EXCLUDED.de,
  updated_at = NOW();
