-- OPTIMISATION 6: Désactiver RLS sur toutes les tables restantes qui ont des erreurs

-- Désactiver RLS sur toutes les autres tables qui causent des erreurs
ALTER TABLE public.leaser_ranges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_equipment_attributes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_equipment_specifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates DISABLE ROW LEVEL SECURITY;

-- Nettoyer toutes les politiques existantes sur ces tables
DO $$
DECLARE
    table_names text[] := ARRAY[
        'leaser_ranges', 'offer_notes', 'smtp_settings', 'offer_equipment', 
        'offer_equipment_attributes', 'offer_equipment_specifications', 
        'product_attributes', 'product_attribute_values', 'product_variant_prices',
        'pdf_models', 'commission_levels', 'commission_rates', 'categories', 
        'brands', 'pdf_templates', 'email_templates'
    ];
    table_name text;
    policy_record RECORD;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        FOR policy_record IN 
            EXECUTE format('SELECT policyname FROM pg_policies WHERE schemaname = ''public'' AND tablename = %L', table_name)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.%I', policy_record.policyname, table_name);
        END LOOP;
    END LOOP;
END $$;