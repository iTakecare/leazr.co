-- S'assurer que le bucket Client Logos existe et est public
SELECT public.create_storage_bucket('Client Logos');

-- Créer les politiques pour le bucket Client Logos en utilisant la fonction existante
SELECT public.create_storage_policy('Client Logos', 'Client Logos Public Read', 'true', 'SELECT');
SELECT public.create_storage_policy('Client Logos', 'Client Logos Authenticated Insert', 'auth.uid() IS NOT NULL', 'INSERT');
SELECT public.create_storage_policy('Client Logos', 'Client Logos Authenticated Update', 'auth.uid() IS NOT NULL', 'UPDATE');
SELECT public.create_storage_policy('Client Logos', 'Client Logos Authenticated Delete', 'auth.uid() IS NOT NULL', 'DELETE');