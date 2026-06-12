-- Rattache automatiquement les nouvelles données à la centrale (HQ) si aucun
-- comptoir n'est précisé. Garantit que la vue centrale reste complète.
CREATE OR REPLACE FUNCTION public.set_default_cost_center()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.cost_center_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT id INTO NEW.cost_center_id
    FROM public.cost_centers
    WHERE company_id = NEW.company_id AND is_headquarters
    ORDER BY created_at LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contracts','offers','invoices','supplier_invoices','clients'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_default_cost_center ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_default_cost_center BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_default_cost_center()', t);
  END LOOP;
END $$;
