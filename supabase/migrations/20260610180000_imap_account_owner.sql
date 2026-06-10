-- Propriété des boîtes mail : chaque collaborateur ne voit que SES comptes
-- dans la boîte mail (MailboxPage filtre owner_user_id = utilisateur courant).
-- Les comptes sans propriétaire restent gérables dans « Comptes mail » et
-- assignables à un collègue (ex. sales@ = boîte de Tohann).
ALTER TABLE public.imap_accounts ADD COLUMN IF NOT EXISTS owner_user_id uuid;
-- hello@ → Gianni (les autres comptes restent à assigner à leur propriétaire).
UPDATE public.imap_accounts
SET owner_user_id = '673c3806-1584-495b-a148-ae298639aa65'
WHERE email_address = 'hello@itakecare.be' AND owner_user_id IS NULL;
