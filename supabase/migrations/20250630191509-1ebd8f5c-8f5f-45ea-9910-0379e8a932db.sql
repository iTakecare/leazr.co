
-- Créer la table contract_equipment pour stocker les équipements détaillés des contrats
CREATE TABLE public.contract_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title text NOT NULL,
  purchase_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  margin numeric NOT NULL DEFAULT 0,
  monthly_payment numeric,
  serial_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Créer la table contract_equipment_attributes pour les attributs des équipements
CREATE TABLE public.contract_equipment_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.contract_equipment(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Créer la table contract_equipment_specifications pour les spécifications des équipements
CREATE TABLE public.contract_equipment_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.contract_equipment(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Créer la table contract_documents pour gérer les documents des contrats
CREATE TABLE public.contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'facture', 'bon_commande', 'bon_livraison', 'autre'
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes text,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Créer des index pour améliorer les performances
CREATE INDEX idx_contract_equipment_contract_id ON public.contract_equipment(contract_id);
CREATE INDEX idx_contract_equipment_attributes_equipment_id ON public.contract_equipment_attributes(equipment_id);
CREATE INDEX idx_contract_equipment_specifications_equipment_id ON public.contract_equipment_specifications(equipment_id);
CREATE INDEX idx_contract_documents_contract_id ON public.contract_documents(contract_id);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.contract_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_equipment_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_equipment_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS pour contract_equipment
CREATE POLICY "contract_equipment_company_access" ON public.contract_equipment
FOR ALL USING (
  contract_id IN (
    SELECT id FROM public.contracts 
    WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Créer des politiques RLS pour contract_equipment_attributes
CREATE POLICY "contract_equipment_attributes_company_access" ON public.contract_equipment_attributes
FOR ALL USING (
  equipment_id IN (
    SELECT ce.id FROM public.contract_equipment ce
    JOIN public.contracts c ON ce.contract_id = c.id
    WHERE c.company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Créer des politiques RLS pour contract_equipment_specifications
CREATE POLICY "contract_equipment_specifications_company_access" ON public.contract_equipment_specifications
FOR ALL USING (
  equipment_id IN (
    SELECT ce.id FROM public.contract_equipment ce
    JOIN public.contracts c ON ce.contract_id = c.id
    WHERE c.company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Créer des politiques RLS pour contract_documents
CREATE POLICY "contract_documents_company_access" ON public.contract_documents
FOR ALL USING (
  contract_id IN (
    SELECT id FROM public.contracts 
    WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
