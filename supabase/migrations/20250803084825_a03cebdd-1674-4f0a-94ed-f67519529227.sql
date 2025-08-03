-- Ajouter un champ default_leaser_id à la table clients
ALTER TABLE public.clients 
ADD COLUMN default_leaser_id uuid REFERENCES public.leasers(id);

-- Ajouter un champ leaser_id à la table offers
ALTER TABLE public.offers 
ADD COLUMN leaser_id uuid REFERENCES public.leasers(id);

-- Assigner Grenke comme leaser par défaut pour tous les clients existants
UPDATE public.clients 
SET default_leaser_id = 'd60b86d7-a129-4a17-a877-e8e5caa66949'
WHERE default_leaser_id IS NULL;

-- Assigner Grenke comme leaser pour toutes les offres existantes
UPDATE public.offers 
SET leaser_id = 'd60b86d7-a129-4a17-a877-e8e5caa66949'
WHERE leaser_id IS NULL;