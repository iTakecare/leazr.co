-- La contrainte CHECK sur chat_messages.message_type n'autorisait que
-- ('text','image','file','system') alors que le webhook messaging-webhook
-- insère les pièces jointes WhatsApp/SMS avec message_type='media'. L'insert
-- échouait donc silencieusement (fichier uploadé dans le bucket chat-media
-- mais aucune ligne pour l'afficher). On élargit la contrainte à 'media'.

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'system'::text, 'media'::text]));
