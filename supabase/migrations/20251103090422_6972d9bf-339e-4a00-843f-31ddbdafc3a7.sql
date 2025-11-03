-- Phase 1.3: Correction de sécurité pour la fonction increment_rate_limit
-- Ajoute le search_path pour éviter les attaques par injection de schéma

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_window_start TIMESTAMPTZ,
  p_max_requests INTEGER
) RETURNS TABLE(allowed BOOLEAN, remaining INTEGER) AS $$
DECLARE
  v_current_count INTEGER;
BEGIN
  -- Insérer ou récupérer le compteur actuel de manière atomique
  INSERT INTO rate_limits (identifier, endpoint, window_start, request_count)
  VALUES (p_identifier, p_endpoint, p_window_start, 1)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING rate_limits.request_count INTO v_current_count;

  -- Retourner si la requête est autorisée et le nombre restant
  IF v_current_count <= p_max_requests THEN
    RETURN QUERY SELECT TRUE, p_max_requests - v_current_count;
  ELSE
    RETURN QUERY SELECT FALSE, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;