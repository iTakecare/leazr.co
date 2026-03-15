ALTER TABLE public.user_imap_settings ADD COLUMN IF NOT EXISTS sync_days integer DEFAULT 7;
ALTER TABLE public.synced_emails ADD COLUMN IF NOT EXISTS ai_analysis text;
ALTER TABLE public.synced_emails ADD COLUMN IF NOT EXISTS ai_suggestions jsonb;
ALTER TABLE public.synced_emails ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;