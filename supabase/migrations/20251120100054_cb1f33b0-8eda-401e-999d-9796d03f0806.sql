-- Add foreign key constraint to link categories.type to category_types.value
-- This ensures data integrity and enables efficient joins

-- First, add index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_category_types_value ON category_types(value);

-- Add foreign key constraint
-- ON UPDATE CASCADE: if category_types.value is updated, it propagates to categories
-- ON DELETE RESTRICT: cannot delete a category_type if it's used by categories
ALTER TABLE categories
ADD CONSTRAINT categories_type_fkey 
FOREIGN KEY (type) 
REFERENCES category_types(value) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;