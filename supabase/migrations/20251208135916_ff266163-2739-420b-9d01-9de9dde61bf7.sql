-- Activer le scoring sur l'étape "Analyse interne" (internal_review) pour custom_pack_request
UPDATE workflow_steps
SET 
  enables_scoring = true,
  scoring_type = 'internal'
WHERE workflow_template_id IN (
  SELECT id FROM workflow_templates 
  WHERE offer_type = 'custom_pack_request'
)
AND step_key = 'internal_review';

-- Activer le scoring sur l'étape "Résultat leaser" (score_leaser) pour custom_pack_request
UPDATE workflow_steps
SET 
  enables_scoring = true,
  scoring_type = 'leaser'
WHERE workflow_template_id IN (
  SELECT id FROM workflow_templates 
  WHERE offer_type = 'custom_pack_request'
)
AND step_key = 'score_leaser';

-- Également corriger pour client_request si nécessaire
UPDATE workflow_steps
SET 
  enables_scoring = true,
  scoring_type = 'internal'
WHERE workflow_template_id IN (
  SELECT id FROM workflow_templates 
  WHERE offer_type = 'client_request'
)
AND step_key = 'internal_review'
AND (enables_scoring = false OR enables_scoring IS NULL);

UPDATE workflow_steps
SET 
  enables_scoring = true,
  scoring_type = 'leaser'
WHERE workflow_template_id IN (
  SELECT id FROM workflow_templates 
  WHERE offer_type = 'client_request'
)
AND step_key = 'score_leaser'
AND (enables_scoring = false OR enables_scoring IS NULL);