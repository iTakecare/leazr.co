-- Yuki (compta, lecture seule) + CFO IA (rapports, alertes, chat)

-- 1. Autoriser 'yuki' dans company_integrations
ALTER TABLE public.company_integrations
  DROP CONSTRAINT IF EXISTS company_integrations_integration_type_check;
ALTER TABLE public.company_integrations
  ADD CONSTRAINT company_integrations_integration_type_check
  CHECK (integration_type = ANY (ARRAY['billit','grenke','tulip','yuki','other']));

-- 2. Rapports & alertes IA (CFO/CMO)
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL, -- 'cfo_report' | 'cfo_alert' | 'cmo_report'
  period text,        -- ex: '2026-06'
  title text,
  content text,       -- markdown
  data jsonb,         -- agrégats utilisés (audit/debug)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_reports_company_kind_idx ON public.ai_reports(company_id, kind, created_at DESC);
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_reports_company_isolation ON public.ai_reports;
CREATE POLICY ai_reports_company_isolation ON public.ai_reports
  FOR ALL USING ((company_id = get_user_company_id()) OR is_admin_optimized())
  WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- 3. Crons CFO IA (V1 mono-tenant, companyId iTakecare)
SELECT cron.unschedule('cfo-monthly-report') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='cfo-monthly-report');
SELECT cron.schedule(
  'cfo-monthly-report', '0 5 1 * *',
  $cron$
  SELECT net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/cfo-ai',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SERVICE_ROLE_KEY>','apikey','<SERVICE_ROLE_KEY>'),
    body := jsonb_build_object('companyId','c1ce66bb-3ad2-474d-b477-583baa7ff1c0','action','report')
  );
  $cron$
);
SELECT cron.unschedule('cfo-daily-alerts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='cfo-daily-alerts');
SELECT cron.schedule(
  'cfo-daily-alerts', '45 6 * * 1-5',
  $cron$
  SELECT net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/cfo-ai',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SERVICE_ROLE_KEY>','apikey','<SERVICE_ROLE_KEY>'),
    body := jsonb_build_object('companyId','c1ce66bb-3ad2-474d-b477-583baa7ff1c0','action','alerts')
  );
  $cron$
);
