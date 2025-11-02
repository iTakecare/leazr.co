-- Corriger les URLs avec double slash après l'ID du produit
-- Pattern erroné : .../products/52605c7f-...//image-xxx.png
-- Pattern correct : .../products/52605c7f-.../image-xxx.png

UPDATE products
SET image_url = REGEXP_REPLACE(
  image_url, 
  '(/products/[a-f0-9-]+)//image-',
  '\1/image-',
  'g'
)
WHERE image_url ~ '/products/[a-f0-9-]+//image-'
AND company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';