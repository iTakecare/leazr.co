-- Add fields to support equipment division
ALTER TABLE contract_equipment 
ADD COLUMN parent_equipment_id uuid REFERENCES contract_equipment(id),
ADD COLUMN is_individual boolean DEFAULT false,
ADD COLUMN individual_serial_number text;

-- Create index for better performance
CREATE INDEX idx_contract_equipment_parent ON contract_equipment(parent_equipment_id);
CREATE INDEX idx_contract_equipment_individual ON contract_equipment(is_individual);

-- Add constraint to ensure individual equipment has quantity 1
ALTER TABLE contract_equipment 
ADD CONSTRAINT check_individual_quantity 
CHECK (NOT is_individual OR quantity = 1);