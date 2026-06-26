-- Langue de communication par client (FR par défaut), utilisée par toutes les
-- communications sortantes (emails commerciaux, demandes de documents, relances,
-- WhatsApp/SMS) lorsqu'aucune surcharge n'est passée au moment de l'envoi.
-- Appliquée en prod via l'API Management le 2026-06-26.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS communication_language text NOT NULL DEFAULT 'fr'
  CHECK (communication_language IN ('fr', 'nl', 'en', 'de'));
