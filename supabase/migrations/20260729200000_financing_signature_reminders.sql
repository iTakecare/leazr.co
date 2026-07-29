-- WINLEASE PHASE 3 bis : relances automatiques de signature + PDF final
-- - suivi des relances par signataire (last_reminded_at / reminder_count)
-- - marqueur de génération du PDF final 3 signatures sur la cérémonie
-- - cron quotidien qui appelle financing-signature {action: remind_pending}
--   (relance le signataire de l'étape courante, notifie les contre-signataires
--   devenus courants, et finalise le PDF des cérémonies terminées)
-- NB : <SERVICE_ROLE_KEY> est substitué par le script d'application
--      (scripts/apply-financing-reminders.mjs) — jamais commité en clair ici.

ALTER TABLE public.signature_ceremony_signers
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.signature_ceremonies
  ADD COLUMN IF NOT EXISTS final_pdf_generated_at timestamptz;

create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('financing-signature-reminders');
exception when others then null;
end $$;

select cron.schedule(
  'financing-signature-reminders',
  '0 8 * * *',
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/financing-signature',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object('action', 'remind_pending')
  );
  $cron$
);
