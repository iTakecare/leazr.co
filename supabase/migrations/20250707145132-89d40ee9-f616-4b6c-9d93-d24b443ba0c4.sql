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
  BEGIN
    INSERT INTO public.offer_workflow_logs (
      offer_id,
      user_id,
      previous_status,
      new_status,
      reason,
      user_name
    )
    VALUES (
      p_offer_id,
      NULL, -- Pas d'utilisateur authentifié pour les signatures publiques
      current_status,
      'approved',
      'Offre signée électroniquement par ' || trim(p_signer_name) || 
      CASE WHEN p_signer_ip IS NOT NULL THEN ' depuis l''adresse IP ' || p_signer_ip ELSE '' END,
      'Système (signature publique)'
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Ne pas échouer si l'ajout du log échoue
      RAISE NOTICE 'Impossible d''ajouter le log de workflow: %', SQLERRM;
  END;
  
  RETURN true;
END;
$function$;

-- Créer une politique RLS pour permettre l'accès en lecture aux offres publiques
CREATE POLICY "Public offers can be read for signing" ON public.offers
FOR SELECT 
USING (
  auth.role() = 'anon' AND 
  workflow_status IN ('sent', 'draft', 'approved')
);

-- Permettre aux utilisateurs anonymes d'insérer dans offer_workflow_logs via la fonction
CREATE POLICY "Allow system workflow logs" ON public.offer_workflow_logs
FOR INSERT 
WITH CHECK (
  user_id IS NULL AND 
  user_name = 'Système (signature publique)'
);