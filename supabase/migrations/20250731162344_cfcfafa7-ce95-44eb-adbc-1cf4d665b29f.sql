-- Modifier la contrainte pour autoriser 'invitation' comme token_type
ALTER TABLE custom_auth_tokens 
DROP CONSTRAINT custom_auth_tokens_token_type_check;

ALTER TABLE custom_auth_tokens 
ADD CONSTRAINT custom_auth_tokens_token_type_check 
CHECK (token_type = ANY (ARRAY['signup'::text, 'password_reset'::text, 'email_verification'::text, 'invitation'::text]));