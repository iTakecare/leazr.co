
-- Table: contact_submissions
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (contact form is public)
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

-- Company members can read
CREATE POLICY "Company members can read submissions"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Company members can update status
CREATE POLICY "Company members can update submissions"
  ON public.contact_submissions FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Table: support_tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  contact_submission_id uuid REFERENCES public.contact_submissions(id) ON DELETE SET NULL,
  email_id uuid,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can read tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Company members can insert tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Company members can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Table: user_imap_settings
CREATE TABLE public.user_imap_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  imap_host text NOT NULL,
  imap_port integer NOT NULL DEFAULT 993,
  imap_username text NOT NULL,
  imap_password_encrypted text NOT NULL,
  imap_use_ssl boolean NOT NULL DEFAULT true,
  folder text NOT NULL DEFAULT 'INBOX',
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

ALTER TABLE public.user_imap_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own IMAP settings"
  ON public.user_imap_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: synced_emails
CREATE TABLE public.synced_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  from_address text,
  from_name text,
  to_address text,
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz,
  is_read boolean NOT NULL DEFAULT false,
  linked_ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  linked_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

ALTER TABLE public.synced_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own synced emails"
  ON public.synced_emails FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own synced emails"
  ON public.synced_emails FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert synced emails"
  ON public.synced_emails FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
