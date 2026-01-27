-- Add cc_email column to contracts table for carbon copy functionality
ALTER TABLE contracts 
ADD COLUMN cc_email TEXT;

COMMENT ON COLUMN contracts.cc_email IS 'Adresse email en copie lors de l''envoi du contrat';