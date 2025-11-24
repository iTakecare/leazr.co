-- Table pour les notifications admin de secours
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_offer', 'system_alert', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_company_id ON admin_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_offer_id ON admin_notifications(offer_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- RLS policies
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent voir leurs notifications
CREATE POLICY "Admins can view their company notifications"
  ON admin_notifications
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Les admins peuvent marquer comme lu
CREATE POLICY "Admins can update their company notifications"
  ON admin_notifications
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fonction pour récupérer les emails des admins directement
CREATE OR REPLACE FUNCTION get_admin_emails_for_company(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as name
  FROM profiles p
  INNER JOIN auth.users au ON au.id = p.id
  WHERE p.company_id = p_company_id
    AND p.role = 'admin'
    AND au.email IS NOT NULL;
END;
$$;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_admin_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_notifications_updated_at
  BEFORE UPDATE ON admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_notifications_updated_at();