-- Migration: Create offer_call_logs table for tracking client call attempts and callback reminders
CREATE TABLE IF NOT EXISTS offer_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('voicemail', 'no_answer', 'reached')),
  callback_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_offer_call_logs_offer_id ON offer_call_logs(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_call_logs_company_id ON offer_call_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_offer_call_logs_callback_date ON offer_call_logs(callback_date) WHERE callback_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offer_call_logs_company_callback ON offer_call_logs(company_id, callback_date) WHERE callback_date IS NOT NULL;

-- Row Level Security
ALTER TABLE offer_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_logs_select"
  ON offer_call_logs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "call_logs_insert"
  ON offer_call_logs FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "call_logs_delete"
  ON offer_call_logs FOR DELETE
  USING (created_by = auth.uid());
