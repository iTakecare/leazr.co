-- Journalisation d'ÉVÉNEMENTS (au-delà des seuls changements de statut) dans
-- l'historique d'une demande : envois d'e-mails, PDF, signature/Grenke, swap…
-- event_type IS NULL => ligne de transition de statut (comportement existant).
ALTER TABLE public.offer_workflow_logs ADD COLUMN IF NOT EXISTS event_type text;
