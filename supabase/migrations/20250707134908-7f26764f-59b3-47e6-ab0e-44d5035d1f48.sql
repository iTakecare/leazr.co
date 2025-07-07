-- Corriger l'user_id manquant dans l'offre
UPDATE offers 
SET user_id = (
  SELECT id FROM profiles 
  WHERE company_id = '673c3806-1584-495b-a148-ae298639aa65' 
  AND role IN ('admin', 'super_admin') 
  LIMIT 1
)
WHERE id = '50ff7921-c9db-40b5-b568-3e567ac5a983' AND user_id IS NULL;