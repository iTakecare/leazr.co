-- Create table to store reminder history
CREATE TABLE public.offer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('document_reminder', 'offer_reminder')),
  reminder_level INTEGER NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id),
  custom_message TEXT,
  email_subject TEXT,
  recipient_email TEXT
);

-- Create index for fast lookups
CREATE INDEX idx_offer_reminders_offer_id ON public.offer_reminders(offer_id);
CREATE INDEX idx_offer_reminders_type_level ON public.offer_reminders(reminder_type, reminder_level);

-- Enable RLS
ALTER TABLE public.offer_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reminders for offers belonging to their company
CREATE POLICY "offer_reminders_company_access" ON public.offer_reminders
FOR ALL
USING (
  offer_id IN (
    SELECT o.id FROM public.offers o
    WHERE o.company_id = get_user_company_id()
  )
  OR is_admin_optimized()
)
WITH CHECK (
  offer_id IN (
    SELECT o.id FROM public.offers o
    WHERE o.company_id = get_user_company_id()
  )
  OR is_admin_optimized()
);

-- Add to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_reminders;