-- Modify companies table for trial management
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'trial';

-- Add constraint for account_status
ALTER TABLE public.companies 
ADD CONSTRAINT companies_account_status_check 
CHECK (account_status IN ('trial', 'active', 'expired', 'cancelled'));

-- Create email confirmation tokens table
CREATE TABLE IF NOT EXISTS public.company_email_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email confirmations
ALTER TABLE public.company_email_confirmations ENABLE ROW LEVEL SECURITY;

-- Create policy for email confirmations
CREATE POLICY "Company email confirmations are public for verification" 
ON public.company_email_confirmations 
FOR ALL 
USING (true);