-- ============================================================================
-- Envoi et archivage automatiques de l'offre signée
--
-- Jusqu'ici, signer produisait une preuve que personne ne recevait : le PDF
-- était généré dans le navigateur du client puis téléchargé sur SON poste, et
-- rien n'était ni archivé ni envoyé.
--
-- `signed_pdf_sent_at` sert de verrou d'idempotence : le navigateur peut
-- rejouer l'appel (rechargement, double clic, reprise), l'envoi ne part
-- qu'une fois.
-- ============================================================================

-- @@SPLIT@@
alter table public.offers
  add column if not exists signed_pdf_path    text,
  add column if not exists signed_pdf_sent_at timestamptz;

-- @@SPLIT@@
-- Le client anonyme qui signe ne doit pas pouvoir écrire dans le bucket : c'est
-- l'edge function `signed-offer-delivery` qui dépose le fichier avec la clé de
-- service, via une URL d'upload signée à usage unique.
insert into storage.buckets (id, name, public)
select 'offer-documents', 'offer-documents', false
 where not exists (select 1 from storage.buckets where id = 'offer-documents');
