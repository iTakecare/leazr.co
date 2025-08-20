-- Activer le module invoicing pour iTakecare
UPDATE companies 
SET modules_enabled = array_append(modules_enabled, 'invoicing')
WHERE name = 'iTakecare' 
  AND NOT ('invoicing' = ANY(modules_enabled));

-- Vérifier le résultat
SELECT name, modules_enabled 
FROM companies 
WHERE name = 'iTakecare';