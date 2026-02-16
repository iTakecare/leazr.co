
-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  due_date timestamptz,
  related_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  related_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  related_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS: company isolation via profiles.company_id
CREATE POLICY "tasks_company_isolation" ON public.tasks
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Update trigger
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set completed_at
CREATE OR REPLACE FUNCTION public.tasks_set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tasks_completed_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_set_completed_at();

-- =============================================
-- TASK COMMENTS TABLE
-- =============================================
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_company_isolation" ON public.task_comments
  FOR ALL TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      WHERE t.company_id IN (
        SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      WHERE t.company_id IN (
        SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);

-- =============================================
-- TASK NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  type text NOT NULL CHECK (type IN ('assigned', 'comment', 'status_change', 'due_soon', 'overdue')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_notifications_own_only" ON public.task_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "task_notifications_insert" ON public.task_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      WHERE t.company_id IN (
        SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "task_notifications_update_own" ON public.task_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_task_notifications_user_id ON public.task_notifications(user_id);
CREATE INDEX idx_task_notifications_is_read ON public.task_notifications(user_id, is_read);

-- Enable realtime for task_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_notifications;
