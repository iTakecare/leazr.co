-- Corriger l'orthographe du pays "Belgioque" vers "Belgique"
UPDATE public.leasers 
SET country = 'Belgique' 
WHERE country = 'Belgioque';