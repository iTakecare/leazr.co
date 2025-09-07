-- Migration to merge Winfinance duplicate clients (Simplified version)
-- Keep: Winfinance SRL (48eba76a-7e2b-4301-8193-52746839de23)
-- Delete: Winfinance (95a70859-c14e-4309-aed0-b470da22aed5) and Zakaria Gayet - Winfinance #3 (b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a)

-- Step 1: First, reset all primary flags for the target client to avoid constraint violations
UPDATE public.collaborators 
SET is_primary = false 
WHERE client_id = '48eba76a-7e2b-4301-8193-52746839de23';

-- Step 2: Reset primary flags for all collaborators that will be transferred
UPDATE public.collaborators 
SET is_primary = false 
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 3: Transfer any offers from duplicate clients to primary client
UPDATE public.offers 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 4: Transfer collaborators from duplicate clients to primary client
UPDATE public.collaborators 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 5: Transfer any contracts from duplicate clients to primary client
UPDATE public.contracts 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 6: Transfer any ambassador_clients relationships
UPDATE public.ambassador_clients 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 7: Transfer any client delivery sites
UPDATE public.client_delivery_sites 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 8: Transfer any custom pricing data
UPDATE public.client_custom_prices 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

UPDATE public.client_custom_variant_prices 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 9: Handle duplicate collaborators - remove exact duplicates
DELETE FROM public.collaborators 
WHERE id IN (
  SELECT c2.id 
  FROM public.collaborators c1
  JOIN public.collaborators c2 ON c1.name = c2.name 
    AND COALESCE(c1.email, '') = COALESCE(c2.email, '')
    AND c1.client_id = c2.client_id
    AND c1.id < c2.id
  WHERE c1.client_id = '48eba76a-7e2b-4301-8193-52746839de23'
);

-- Step 10: Set the oldest collaborator as primary
UPDATE public.collaborators 
SET is_primary = true 
WHERE id = (
  SELECT id 
  FROM public.collaborators 
  WHERE client_id = '48eba76a-7e2b-4301-8193-52746839de23' 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Step 11: Finally, delete the duplicate clients
DELETE FROM public.clients 
WHERE id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');