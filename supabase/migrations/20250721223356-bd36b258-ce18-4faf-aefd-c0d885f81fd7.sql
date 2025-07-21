
-- Extension de la table products pour la gestion d'inventaire
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS serial_number text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text DEFAULT 'available';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty_end_date timestamp with time zone;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_date timestamp with time zone;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_maintenance_date timestamp with time zone;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS next_maintenance_date timestamp with time zone;

-- Table pour le suivi des mouvements d'équipement
CREATE TABLE IF NOT EXISTS public.equipment_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL, -- 'in', 'out', 'transfer', 'maintenance', 'return'
  from_location text,
  to_location text,
  from_user_id uuid REFERENCES public.profiles(id),
  to_user_id uuid REFERENCES public.profiles(id),
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  company_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table pour la gestion de la maintenance
CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL, -- 'preventive', 'corrective', 'inspection'
  description text NOT NULL,
  scheduled_date timestamp with time zone,
  completed_date timestamp with time zone,
  performed_by text,
  cost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  company_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table pour les demandes de matériel (workflow)
CREATE TABLE IF NOT EXISTS public.equipment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid REFERENCES public.products(id),
  requester_id uuid NOT NULL REFERENCES public.profiles(id),
  request_type text NOT NULL, -- 'assignment', 'transfer', 'maintenance', 'purchase'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'in_progress', 'completed'
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  title text NOT NULL,
  description text,
  justification text,
  requested_date timestamp with time zone,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  rejection_reason text,
  estimated_cost numeric,
  company_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table pour les alertes et notifications
CREATE TABLE IF NOT EXISTS public.equipment_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid REFERENCES public.products(id),
  alert_type text NOT NULL, -- 'maintenance_due', 'warranty_expiring', 'overdue_return', 'location_change'
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  target_user_id uuid REFERENCES public.profiles(id),
  company_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone
);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.equipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_alerts ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour equipment_tracking
CREATE POLICY "equipment_tracking_company_isolation" ON public.equipment_tracking
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Politiques RLS pour equipment_maintenance
CREATE POLICY "equipment_maintenance_company_isolation" ON public.equipment_maintenance
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Politiques RLS pour equipment_requests
CREATE POLICY "equipment_requests_company_isolation" ON public.equipment_requests
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Politiques RLS pour equipment_alerts
CREATE POLICY "equipment_alerts_company_isolation" ON public.equipment_alerts
FOR ALL USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Fonction pour créer automatiquement des alertes de maintenance
CREATE OR REPLACE FUNCTION public.create_maintenance_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Alertes pour maintenance due dans les 7 prochains jours
  INSERT INTO public.equipment_alerts (
    equipment_id,
    alert_type,
    title,
    message,
    severity,
    company_id
  )
  SELECT 
    p.id,
    'maintenance_due',
    'Maintenance due for ' || p.name,
    'Equipment ' || p.name || ' requires maintenance by ' || p.next_maintenance_date::date,
    'warning',
    p.company_id
  FROM public.products p
  WHERE p.next_maintenance_date IS NOT NULL
    AND p.next_maintenance_date <= (now() + interval '7 days')
    AND p.next_maintenance_date > now()
    AND NOT EXISTS (
      SELECT 1 FROM public.equipment_alerts ea
      WHERE ea.equipment_id = p.id
        AND ea.alert_type = 'maintenance_due'
        AND ea.is_dismissed = false
        AND ea.created_at > (now() - interval '1 day')
    );

  -- Alertes pour garantie expirant dans les 30 prochains jours
  INSERT INTO public.equipment_alerts (
    equipment_id,
    alert_type,
    title,
    message,
    severity,
    company_id
  )
  SELECT 
    p.id,
    'warranty_expiring',
    'Warranty expiring for ' || p.name,
    'Equipment ' || p.name || ' warranty expires on ' || p.warranty_end_date::date,
    'info',
    p.company_id
  FROM public.products p
  WHERE p.warranty_end_date IS NOT NULL
    AND p.warranty_end_date <= (now() + interval '30 days')
    AND p.warranty_end_date > now()
    AND NOT EXISTS (
      SELECT 1 FROM public.equipment_alerts ea
      WHERE ea.equipment_id = p.id
        AND ea.alert_type = 'warranty_expiring'
        AND ea.is_dismissed = false
        AND ea.created_at > (now() - interval '7 days')
    );
END;
$$;

-- Trigger pour créer automatiquement un tracking lors de changement de statut ou d'assignation
CREATE OR REPLACE FUNCTION public.track_equipment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si le statut a changé
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.equipment_tracking (
      equipment_id,
      movement_type,
      notes,
      created_by,
      company_id
    ) VALUES (
      NEW.id,
      'status_change',
      'Status changed from ' || COALESCE(OLD.status, 'unknown') || ' to ' || NEW.status,
      auth.uid(),
      NEW.company_id
    );
  END IF;

  -- Si l'assignation a changé
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.equipment_tracking (
      equipment_id,
      movement_type,
      from_user_id,
      to_user_id,
      notes,
      created_by,
      company_id
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.assigned_to IS NULL THEN 'assignment'
        WHEN NEW.assigned_to IS NULL THEN 'return'
        ELSE 'transfer'
      END,
      OLD.assigned_to,
      NEW.assigned_to,
      'Assignment changed',
      auth.uid(),
      NEW.company_id
    );
  END IF;

  -- Si la localisation a changé
  IF OLD.location IS DISTINCT FROM NEW.location THEN
    INSERT INTO public.equipment_tracking (
      equipment_id,
      movement_type,
      from_location,
      to_location,
      notes,
      created_by,
      company_id
    ) VALUES (
      NEW.id,
      'location_change',
      OLD.location,
      NEW.location,
      'Location changed',
      auth.uid(),
      NEW.company_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_track_equipment_changes ON public.products;
CREATE TRIGGER trigger_track_equipment_changes
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.track_equipment_changes();

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_equipment_tracking_updated_at
  BEFORE UPDATE ON public.equipment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_maintenance_updated_at
  BEFORE UPDATE ON public.equipment_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_requests_updated_at
  BEFORE UPDATE ON public.equipment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
