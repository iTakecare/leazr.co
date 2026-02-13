ALTER TABLE public.suppliers 
ADD COLUMN supplier_type text NOT NULL DEFAULT 'belgian' 
CHECK (supplier_type IN ('belgian', 'eu'));