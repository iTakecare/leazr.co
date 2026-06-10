-- Recherche de clients par téléphone, insensible au format (espaces, +32, 0…).
-- Compare les 9 derniers chiffres (numéro significatif belge).
CREATE OR REPLACE FUNCTION public.find_clients_by_phone(p_company_id uuid, p_phone text)
RETURNS SETOF public.clients
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.clients
  WHERE company_id = p_company_id
    AND phone IS NOT NULL AND btrim(phone) <> ''
    AND length(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 8
    AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 9)
      = right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 9)
  LIMIT 10;
$$;
GRANT EXECUTE ON FUNCTION public.find_clients_by_phone(uuid, text) TO authenticated;
