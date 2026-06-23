-- Cron hebdomadaire du coach Alex : analyse les transcriptions et envoie par
-- email des suggestions d'ajustement (propose-only). Appliqué via API Management.
-- Secret injecté à l'application (placeholder ici pour la trace).
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin perform cron.unschedule('voice-coach-weekly'); exception when others then null; end $$;

select cron.schedule(
  'voice-coach-weekly',
  '0 7 * * 1', -- lundi 07:00 UTC
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/voice-coach',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Secret','<VOICE_CRON_SECRET>'),
    body := jsonb_build_object('source','cron')
  );
  $cron$
);
