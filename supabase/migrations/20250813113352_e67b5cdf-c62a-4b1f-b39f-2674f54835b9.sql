-- Ajouter les champs de livraison à la table contract_equipment
ALTER TABLE public.contract_equipment 
ADD COLUMN collaborator_id UUID REFERENCES public.collaborators(id),
ADD COLUMN delivery_site_id UUID REFERENCES public.client_delivery_sites(id),
ADD COLUMN delivery_type TEXT CHECK (delivery_type IN ('main_client', 'collaborator', 'predefined_site', 'specific_address')),
ADD COLUMN delivery_address TEXT,
ADD COLUMN delivery_city TEXT,
ADD COLUMN delivery_postal_code TEXT,
ADD COLUMN delivery_country TEXT DEFAULT 'BE',
ADD COLUMN delivery_contact_name TEXT,
ADD COLUMN delivery_contact_email TEXT,
ADD COLUMN delivery_contact_phone TEXT;