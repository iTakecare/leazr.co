-- Maintenant ajouter la contrainte unique pour éviter les futurs doublons
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_contract_id_unique UNIQUE (contract_id);