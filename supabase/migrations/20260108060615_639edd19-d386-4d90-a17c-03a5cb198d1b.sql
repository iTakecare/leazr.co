-- Set favicon for iTakecare company
UPDATE company_customizations 
SET favicon_url = '/favicons/itakecare-favicon.png',
    updated_at = NOW()
WHERE company_id IN (SELECT id FROM companies WHERE LOWER(name) LIKE '%itakecare%');

-- If no customization row exists, create one
INSERT INTO company_customizations (company_id, favicon_url, updated_at)
SELECT id, '/favicons/itakecare-favicon.png', NOW()
FROM companies 
WHERE LOWER(name) LIKE '%itakecare%'
AND id NOT IN (SELECT company_id FROM company_customizations);