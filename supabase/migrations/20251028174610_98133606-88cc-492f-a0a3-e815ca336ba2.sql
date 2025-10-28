-- DATA-ONLY FIX: sanitize NULL text columns in auth.users to prevent GoTrue scan errors
-- No schema changes; limited to updating problematic NULLs to empty strings

-- Update only rows where any of these columns are NULL
update auth.users set
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
where
  email_change is null
  or email_change_token_new is null
  or email_change_token_current is null
  or confirmation_token is null
  or recovery_token is null
  or phone_change is null
  or phone_change_token is null
  or reauthentication_token is null;