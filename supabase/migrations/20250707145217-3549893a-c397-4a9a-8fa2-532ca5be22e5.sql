-- Créer une fonction RPC sécurisée pour la signature publique d'offres
CREATE OR REPLACE FUNCTION public.sign_offer_public(
  p_offer_id uuid,
  p_signature_data text,
  p_signer_name text,
  p_signer_ip text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_status text;
  now_timestamp timestamp with time zone;
BEGIN
  -- Créer un timestamp précis
  now_timestamp := now();
  
  -- Vérifier que l'offre existe et est en statut approprié pour signature
  SELECT workflow_status INTO current_status
  FROM public.offers 
  WHERE id = p_offer_id;
  
  -- Si l'offre n'existe pas
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offre non trouvée avec l''ID: %', p_offer_id;
  END IF;
  
  -- Si l'offre est déjà signée
  IF current_status = 'approved' THEN
    RAISE EXCEPTION 'Cette offre est déjà signée';
  END IF;
  
  -- Vérifier que les données de signature sont valides
  IF p_signature_data IS NULL OR p_signature_data = '' OR NOT p_signature_data LIKE 'data:image/%' THEN
    RAISE EXCEPTION 'Données de signature invalides';
  END IF;
  
  -- Vérifier que le nom du signataire est fourni
  IF p_signer_name IS NULL OR trim(p_signer_name) = '' THEN
    RAISE EXCEPTION 'Le nom du signataire est requis';
  END IF;
  
  -- Mettre à jour l'offre avec la signature
  UPDATE public.offers
  SET 
    workflow_status = 'approved',
    signature_data = p_signature_data,
    signer_name = trim(p_signer_name),
    signed_at = now_timestamp,
    signer_ip = p_signer_ip
  WHERE id = p_offer_id;
  
  -- Ajouter une entrée dans les logs du workflow (en tant que système)
  -- Note: user_id est requis mais on ne peut pas le mettre à NULL, donc on ignore cette insertion pour les signatures publiques
  
  RETURN true;
END;
$function$;

-- Créer une politique RLS pour permettre l'accès en lecture aux offres publiques pour signature
CREATE POLICY "Public offers can be read for signing" ON public.offers
FOR SELECT 
USING (
  auth.role() = 'anon' AND 
  workflow_status IN ('sent', 'draft', 'approved')
);