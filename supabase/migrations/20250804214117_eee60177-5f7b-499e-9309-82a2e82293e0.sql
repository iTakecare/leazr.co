-- Supprimer la table existante et la recréer proprement
DROP TABLE IF EXISTS public.template_comments CASCADE;

-- Créer la table avec toutes les relations correctes
CREATE TABLE public.template_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  field_id text,
  position_x numeric,
  position_y numeric,
  content text NOT NULL,
  comment_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_comment_id uuid REFERENCES public.template_comments(id) ON DELETE CASCADE,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Activer RLS sur la table
ALTER TABLE public.template_comments ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les commentaires de template
CREATE POLICY "Template comments company access" 
ON public.template_comments 
FOR ALL 
USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Créer les tables collaborateurs et approvals si elles n'existent pas
CREATE TABLE IF NOT EXISTS public.template_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor',
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.template_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template collaborators company access" 
ON public.template_collaborators 
FOR ALL 
USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

CREATE TABLE IF NOT EXISTS public.template_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_pdf_templates(id) ON DELETE CASCADE,
  version_id uuid,
  approver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  comments text,
  due_date timestamptz,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.template_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template approvals company access" 
ON public.template_approvals 
FOR ALL 
USING (
  template_id IN (
    SELECT id FROM public.custom_pdf_templates 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);