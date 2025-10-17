-- Migration: Nettoyage des workflows et migration des offres internal_offer
-- Date: 2025-10-17
-- Objectif: Simplifier les types d'offres et supprimer les workflows obsolètes

-- 1. Migrer toutes les offres internal_offer vers client_request
UPDATE public.offers 
SET type = 'client_request',
    updated_at = now()
WHERE type = 'internal_offer';

-- 2. Désactiver les workflows à supprimer avant suppression
UPDATE public.workflow_templates 
SET is_active = false,
    updated_at = now()
WHERE (offer_type = 'internal_offer' AND is_for_contracts = false)
   OR (offer_type = 'standard' AND is_for_contracts = true);

-- 3. Supprimer les étapes des workflows à supprimer
DELETE FROM public.workflow_steps 
WHERE workflow_template_id IN (
  SELECT id FROM public.workflow_templates 
  WHERE (offer_type = 'internal_offer' AND is_for_contracts = false)
     OR (offer_type = 'standard' AND is_for_contracts = true)
);

-- 4. Supprimer les workflows obsolètes
DELETE FROM public.workflow_templates 
WHERE (offer_type = 'internal_offer' AND is_for_contracts = false)
   OR (offer_type = 'standard' AND is_for_contracts = true);