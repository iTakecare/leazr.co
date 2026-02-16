
-- 1. task_subtasks
CREATE TABLE public.task_subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_subtasks_company_access" ON public.task_subtasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = task_subtasks.task_id AND p.id = auth.uid()
    )
  );

-- 2. task_tags
CREATE TABLE public.task_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_tags_company_access" ON public.task_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = task_tags.company_id
    )
  );

-- 3. task_tag_assignments
CREATE TABLE public.task_tag_assignments (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.task_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

ALTER TABLE public.task_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_tag_assignments_company_access" ON public.task_tag_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.company_id = t.company_id
      WHERE t.id = task_tag_assignments.task_id AND p.id = auth.uid()
    )
  );

-- 4. task_templates
CREATE TABLE public.task_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates_company_access" ON public.task_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = task_templates.company_id
    )
  );

-- 5. New columns on tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_type text,
  ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id),
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.task_templates(id),
  ADD COLUMN IF NOT EXISTS last_reminder_sent timestamptz;

-- 6. Indexes (skip idx_tasks_due_date which already exists)
CREATE INDEX idx_task_subtasks_task_id ON public.task_subtasks(task_id);
CREATE INDEX idx_task_tags_company_id ON public.task_tags(company_id);
CREATE INDEX idx_task_tag_assignments_tag_id ON public.task_tag_assignments(tag_id);
CREATE INDEX idx_task_templates_company_id ON public.task_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON public.tasks(recurrence_type) WHERE recurrence_type IS NOT NULL;

-- 7. Enable realtime for subtasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_subtasks;
