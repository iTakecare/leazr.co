
-- Table for ticket replies (conversation thread)
CREATE TABLE public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'client')),
  sender_id UUID,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Admin (company member) can read replies for their company's tickets
CREATE POLICY "Company members can read ticket replies"
  ON public.ticket_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      JOIN public.profiles p ON p.company_id = st.company_id
      WHERE st.id = ticket_replies.ticket_id
      AND p.id = auth.uid()
    )
  );

-- Admin can insert replies
CREATE POLICY "Company members can insert ticket replies"
  ON public.ticket_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      JOIN public.profiles p ON p.company_id = st.company_id
      WHERE st.id = ticket_replies.ticket_id
      AND p.id = auth.uid()
    )
  );

-- Client can read replies on their own tickets
CREATE POLICY "Clients can read own ticket replies"
  ON public.ticket_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      JOIN public.clients c ON c.id = st.client_id
      WHERE st.id = ticket_replies.ticket_id
      AND c.user_id = auth.uid()
    )
  );

-- Client can insert replies on their own tickets
CREATE POLICY "Clients can insert own ticket replies"
  ON public.ticket_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      JOIN public.clients c ON c.id = st.client_id
      WHERE st.id = ticket_replies.ticket_id
      AND c.user_id = auth.uid()
    )
  );

-- Storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ticket-attachments', 'ticket-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload ticket attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can read ticket attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'ticket-attachments');
