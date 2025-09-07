-- Migration to merge Winfinance duplicate clients
-- Keep: Winfinance SRL (48eba76a-7e2b-4301-8193-52746839de23)
-- Delete: Winfinance (95a70859-c14e-4309-aed0-b470da22aed5) and Zakaria Gayet - Winfinance #3 (b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a)

-- Step 1: Transfer any offers from duplicate clients to primary client
UPDATE public.offers 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 2: Transfer collaborators from duplicate clients to primary client
UPDATE public.collaborators 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 3: Transfer any contracts from duplicate clients to primary client
UPDATE public.contracts 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 4: Transfer any ambassador_clients relationships
UPDATE public.ambassador_clients 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 5: Transfer any partner_clients relationships
UPDATE public.partner_clients 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 6: Transfer any client delivery sites
UPDATE public.client_delivery_sites 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 7: Transfer any custom pricing data
UPDATE public.client_custom_prices 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

UPDATE public.client_custom_variant_prices 
SET client_id = '48eba76a-7e2b-4301-8193-52746839de23'
WHERE client_id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');

-- Step 8: Handle duplicate collaborators - merge similar ones
-- First, let's see if there are duplicate collaborators after the merge
WITH duplicate_collaborators AS (
  SELECT name, email, client_id, MIN(created_at) as first_created, COUNT(*) as count
  FROM public.collaborators 
  WHERE client_id = '48eba76a-7e2b-4301-8193-52746839de23'
  GROUP BY name, email, client_id
  HAVING COUNT(*) > 1
)
DELETE FROM public.collaborators 
WHERE id IN (
  SELECT c.id 
  FROM public.collaborators c
  JOIN duplicate_collaborators dc ON c.name = dc.name AND c.email = dc.email AND c.client_id = dc.client_id
  WHERE c.created_at > dc.first_created
);

-- Step 9: Ensure there's only one primary collaborator
UPDATE public.collaborators 
SET is_primary = false 
WHERE client_id = '48eba76a-7e2b-4301-8193-52746839de23';

-- Set the first collaborator as primary
UPDATE public.collaborators 
SET is_primary = true 
WHERE id = (
  SELECT id 
  FROM public.collaborators 
  WHERE client_id = '48eba76a-7e2b-4301-8193-52746839de23' 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Step 10: Finally, delete the duplicate clients
DELETE FROM public.clients 
WHERE id IN ('95a70859-c14e-4309-aed0-b470da22aed5', 'b3ea55d1-bdf4-46c6-a10d-f7ddab03c62a');