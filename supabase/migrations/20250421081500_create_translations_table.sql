
-- Create a function to check if a table exists (if it doesn't already exist)
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1
  );
END;
$$;

-- Create translations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  fr TEXT NOT NULL DEFAULT '',
  en TEXT NOT NULL DEFAULT '',
  nl TEXT NOT NULL DEFAULT '',
  de TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section, key)
);

-- Insert default translations if none exist
INSERT INTO public.translations (section, key, fr, en, nl, de)
VALUES 
  ('common', 'save', 'Enregistrer', 'Save', 'Opslaan', 'Speichern'),
  ('common', 'cancel', 'Annuler', 'Cancel', 'Annuleren', 'Abbrechen'),
  ('common', 'edit', 'Modifier', 'Edit', 'Bewerken', 'Bearbeiten'),
  ('common', 'delete', 'Supprimer', 'Delete', 'Verwijderen', 'Löschen'),
  ('common', 'confirm', 'Confirmer', 'Confirm', 'Bevestigen', 'Bestätigen'),
  ('common', 'back', 'Retour', 'Back', 'Terug', 'Zurück'),
  ('common', 'next', 'Suivant', 'Next', 'Volgende', 'Weiter'),
  ('common', 'loading', 'Chargement...', 'Loading...', 'Laden...', 'Wird geladen...'),
  ('common', 'search', 'Rechercher', 'Search', 'Zoeken', 'Suchen'),
  ('common', 'settings', 'Paramètres', 'Settings', 'Instellingen', 'Einstellungen'),
  ('common', 'dashboard', 'Tableau de bord', 'Dashboard', 'Dashboard', 'Dashboard')
ON CONFLICT (section, key) DO NOTHING;
