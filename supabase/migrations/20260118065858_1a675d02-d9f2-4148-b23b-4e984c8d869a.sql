-- Add workflow_template_id column to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS workflow_template_id UUID REFERENCES workflow_templates(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_offers_workflow_template_id ON offers(workflow_template_id);