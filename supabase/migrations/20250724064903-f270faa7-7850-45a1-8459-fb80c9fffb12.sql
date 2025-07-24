-- Nettoyer les configurations dupliquées (garder seulement la plus récente)
DELETE FROM public.woocommerce_configs 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY site_url, company_id 
             ORDER BY created_at DESC
           ) as rn
    FROM public.woocommerce_configs
  ) t 
  WHERE rn > 1
);

-- Améliorer les noms des configurations existantes
UPDATE public.woocommerce_configs 
SET name = CASE 
  WHEN name LIKE 'Configuration %' THEN 
    'Boutique ' || REPLACE(REPLACE(site_url, 'https://', ''), 'http://', '')
  ELSE name
END
WHERE name IS NULL OR name LIKE 'Configuration %';