-- Ajouter le champ collaborator_id aux tables d'équipements
ALTER TABLE public.offer_equipment 
ADD COLUMN collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL;

ALTER TABLE public.contract_equipment 
ADD COLUMN collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL;

-- Créer des index pour améliorer les performances
CREATE INDEX idx_offer_equipment_collaborator 
ON public.offer_equipment(collaborator_id);

CREATE INDEX idx_contract_equipment_collaborator 
ON public.contract_equipment(collaborator_id);

-- Créer une table pour l'historique des assignations d'équipements
CREATE TABLE public.equipment_assignments_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type text NOT NULL CHECK (equipment_type IN ('offer', 'contract')),
  equipment_id uuid NOT NULL,
  collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  unassigned_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS pour l'historique des assignations
ALTER TABLE public.equipment_assignments_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_assignments_history_access" 
ON public.equipment_assignments_history 
FOR ALL 
USING (
  -- Accès si l'utilisateur a accès au collaborateur (même company)
  EXISTS (
    SELECT 1 FROM public.collaborators c
    JOIN public.clients cl ON c.client_id = cl.id
    WHERE c.id = equipment_assignments_history.collaborator_id 
    AND (cl.company_id = get_user_company_id() OR is_admin_optimized())
  )
  OR
  -- Accès si l'utilisateur est le client propriétaire de l'équipement
  EXISTS (
    SELECT 1 FROM public.clients cl
    WHERE cl.user_id = auth.uid()
    AND cl.id IN (
      SELECT c.client_id FROM public.collaborators c 
      WHERE c.id = equipment_assignments_history.collaborator_id
    )
  )
);

-- Fonction pour enregistrer automatiquement l'historique des assignations
CREATE OR REPLACE FUNCTION public.log_equipment_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si c'est une nouvelle assignation
  IF TG_OP = 'UPDATE' AND OLD.collaborator_id IS DISTINCT FROM NEW.collaborator_id THEN
    -- Marquer l'ancienne assignation comme terminée
    IF OLD.collaborator_id IS NOT NULL THEN
      UPDATE public.equipment_assignments_history 
      SET unassigned_at = NOW()
      WHERE equipment_type = TG_TABLE_NAME::text
        AND equipment_id = OLD.id
        AND collaborator_id = OLD.collaborator_id
        AND unassigned_at IS NULL;
    END IF;
    
    -- Créer une nouvelle entrée si un collaborateur est assigné
    IF NEW.collaborator_id IS NOT NULL THEN
      INSERT INTO public.equipment_assignments_history (
        equipment_type, equipment_id, collaborator_id, assigned_by
      ) VALUES (
        CASE TG_TABLE_NAME 
          WHEN 'offer_equipment' THEN 'offer'
          WHEN 'contract_equipment' THEN 'contract'
        END,
        NEW.id, 
        NEW.collaborator_id, 
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer les triggers pour l'historique
CREATE TRIGGER log_offer_equipment_assignment
  AFTER UPDATE ON public.offer_equipment
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_assignment();

CREATE TRIGGER log_contract_equipment_assignment
  AFTER UPDATE ON public.contract_equipment
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_assignment();