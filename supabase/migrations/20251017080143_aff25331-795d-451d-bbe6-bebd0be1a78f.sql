-- Add scoring configuration columns to workflow_steps
ALTER TABLE workflow_steps
ADD COLUMN IF NOT EXISTS enables_scoring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scoring_type TEXT CHECK (scoring_type IN ('internal', 'leaser', 'client')),
ADD COLUMN IF NOT EXISTS scoring_options JSONB DEFAULT '{"allow_approval": true, "allow_rejection": true, "allow_document_request": true}'::jsonb,
ADD COLUMN IF NOT EXISTS next_step_on_approval TEXT,
ADD COLUMN IF NOT EXISTS next_step_on_rejection TEXT,
ADD COLUMN IF NOT EXISTS next_step_on_docs_requested TEXT;

COMMENT ON COLUMN workflow_steps.enables_scoring IS 'Indicates if this step enables a scoring modal';
COMMENT ON COLUMN workflow_steps.scoring_type IS 'Analysis type: internal, leaser or client';
COMMENT ON COLUMN workflow_steps.scoring_options IS 'Available options in the modal (approval, rejection, document request)';
COMMENT ON COLUMN workflow_steps.next_step_on_approval IS 'step_key of the next step on approval';
COMMENT ON COLUMN workflow_steps.next_step_on_rejection IS 'step_key of the next step on rejection';
COMMENT ON COLUMN workflow_steps.next_step_on_docs_requested IS 'step_key of the next step on document request';

-- Migrate existing data for "Client Request" workflows
UPDATE workflow_steps ws
SET 
  enables_scoring = true,
  scoring_type = 'internal',
  next_step_on_approval = 'leaser_review',
  next_step_on_rejection = 'rejected',
  next_step_on_docs_requested = 'info_requested'
WHERE ws.step_key = 'internal_review'
  AND ws.workflow_template_id IN (
    SELECT id FROM workflow_templates WHERE offer_type = 'client_request' AND is_active = true
  );

UPDATE workflow_steps ws
SET 
  enables_scoring = true,
  scoring_type = 'leaser',
  next_step_on_approval = 'client_approved',
  next_step_on_rejection = 'rejected',
  next_step_on_docs_requested = 'info_requested'
WHERE ws.step_key = 'leaser_review'
  AND ws.workflow_template_id IN (
    SELECT id FROM workflow_templates WHERE offer_type = 'client_request' AND is_active = true
  );