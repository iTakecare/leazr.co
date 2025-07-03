-- Ajouter une contrainte unique sur contract_id dans la table invoices pour éviter les doublons
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_contract_id_unique UNIQUE (contract_id);