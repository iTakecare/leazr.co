-- Script de vérification des variant_id manquants entre iTakecare et Leazr
-- Ce script identifie les produits/variants envoyés par iTakecare qui n'existent pas dans la DB Leazr
-- Exécuter ce script dans le SQL Editor de Supabase

-- ============================================================================
-- 1. Liste des variant_ids récemment utilisés dans les offres
-- ============================================================================

WITH recent_variants AS (
  SELECT DISTINCT
    oe.product_id,
    oe.title as product_name,
    oe.created_at,
    o.offer_number
  FROM offer_equipment oe
  JOIN offers o ON o.id = oe.offer_id
  WHERE oe.created_at >= NOW() - INTERVAL '30 days'
    AND oe.product_id IS NOT NULL
  ORDER BY oe.created_at DESC
),

-- ============================================================================
-- 2. Vérification de l'existence dans product_variant_prices
-- ============================================================================

variant_check AS (
  SELECT 
    rv.product_id,
    rv.product_name,
    rv.offer_number,
    rv.created_at,
    CASE 
      WHEN pvp.id IS NOT NULL THEN '✅ Trouvé'
      ELSE '❌ MANQUANT'
    END as status,
    pvp.price as prix_leazr,
    pvp.attributes
  FROM recent_variants rv
  LEFT JOIN product_variant_prices pvp ON pvp.id = rv.product_id
),

-- ============================================================================
-- 3. Vérification alternative dans la table products (produits simples)
-- ============================================================================

product_fallback AS (
  SELECT 
    rv.product_id,
    rv.product_name,
    CASE 
      WHEN p.id IS NOT NULL THEN '✅ Produit simple'
      ELSE '❌ Introuvable'
    END as fallback_status,
    p.monthly_price as prix_mensuel,
    p.purchase_price as prix_achat
  FROM recent_variants rv
  LEFT JOIN products p ON p.id = rv.product_id
  WHERE NOT EXISTS (
    SELECT 1 FROM product_variant_prices pvp 
    WHERE pvp.id = rv.product_id
  )
)

-- ============================================================================
-- RAPPORT FINAL: Variants manquants
-- ============================================================================

SELECT 
  vc.product_id as "Variant ID",
  vc.product_name as "Nom du produit",
  vc.offer_number as "Numéro offre",
  vc.status as "Status Variant",
  COALESCE(pf.fallback_status, '-') as "Status Produit Simple",
  COALESCE(vc.prix_leazr::text, pf.prix_achat::text, '0') as "Prix Leazr (€)",
  vc.created_at as "Date utilisation"
FROM variant_check vc
LEFT JOIN product_fallback pf ON pf.product_id = vc.product_id
WHERE vc.status = '❌ MANQUANT' 
  AND (pf.fallback_status IS NULL OR pf.fallback_status = '❌ Introuvable')
ORDER BY vc.created_at DESC;

-- ============================================================================
-- STATISTIQUES GLOBALES
-- ============================================================================

SELECT 
  COUNT(*) as "Total variants utilisés (30 jours)",
  SUM(CASE WHEN vc.status = '✅ Trouvé' THEN 1 ELSE 0 END) as "Variants trouvés",
  SUM(CASE WHEN vc.status = '❌ MANQUANT' 
        AND (pf.fallback_status IS NULL OR pf.fallback_status = '❌ Introuvable') 
        THEN 1 ELSE 0 END) as "⚠️ VARIANTS MANQUANTS",
  SUM(CASE WHEN pf.fallback_status = '✅ Produit simple' THEN 1 ELSE 0 END) as "Produits simples (OK)"
FROM variant_check vc
LEFT JOIN product_fallback pf ON pf.product_id = vc.product_id;

-- ============================================================================
-- AIDE: Créer les variants manquants
-- ============================================================================

-- Pour créer un variant manquant dans Leazr, exécuter:
-- 
-- INSERT INTO product_variant_prices (
--   id,                    -- UUID du variant (doit correspondre à celui envoyé par iTakecare)
--   product_id,            -- UUID du produit parent dans Leazr
--   price,                 -- Prix d'achat HT
--   monthly_price,         -- Mensualité
--   attributes             -- JSON des attributs du variant
-- ) VALUES (
--   'uuid-from-itakecare',
--   'parent-product-uuid',
--   1299.00,
--   77.85,
--   '{"Storage": "256GB", "Color": "Space Gray"}'::jsonb
-- );
