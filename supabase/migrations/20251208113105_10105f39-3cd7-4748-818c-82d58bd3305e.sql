-- Créer la table credit_notes pour les notes de crédit
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  credit_note_number TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  billing_data JSONB NOT NULL DEFAULT '{}',
  issued_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter les colonnes à la table invoices pour le suivi des notes de crédit
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS credited_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_note_id UUID REFERENCES public.credit_notes(id);

-- Activer RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour les utilisateurs de la même entreprise
CREATE POLICY "Users can view credit notes from their company"
ON public.credit_notes
FOR SELECT
USING (company_id = public.get_user_company_id());

-- Politique d'insertion pour les admins
CREATE POLICY "Admins can create credit notes"
ON public.credit_notes
FOR INSERT
WITH CHECK (company_id = public.get_user_company_id());

-- Politique de mise à jour pour les admins
CREATE POLICY "Admins can update credit notes"
ON public.credit_notes
FOR UPDATE
USING (company_id = public.get_user_company_id());

-- Politique de suppression pour les admins
CREATE POLICY "Admins can delete credit notes"
ON public.credit_notes
FOR DELETE
USING (company_id = public.get_user_company_id());

-- Index pour les performances
CREATE INDEX idx_credit_notes_company_id ON public.credit_notes(company_id);
CREATE INDEX idx_credit_notes_invoice_id ON public.credit_notes(invoice_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_credit_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_credit_notes_updated_at
BEFORE UPDATE ON public.credit_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_credit_notes_updated_at();

-- Fonction pour générer le numéro de note de crédit
CREATE OR REPLACE FUNCTION public.generate_credit_note_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
BEGIN
  current_year := EXTRACT(year FROM now())::TEXT;
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(credit_note_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.credit_notes
  WHERE company_id = p_company_id
    AND credit_note_number LIKE 'NC-' || current_year || '-%';
  
  RETURN 'NC-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$;

-- Mettre à jour la fonction get_monthly_financial_data pour soustraire les notes de crédit
CREATE OR REPLACE FUNCTION public.get_monthly_financial_data()
 RETURNS TABLE(month_name text, month_number integer, year integer, revenue numeric, purchases numeric, margin numeric, margin_percentage numeric, contracts_count integer, offers_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_company_id UUID;
    current_year INTEGER := EXTRACT(year FROM now());
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH months AS (
        SELECT 
            generate_series(1, 12) as month_num,
            TO_CHAR(TO_DATE(generate_series(1, 12)::text, 'MM'), 'Month') as month_name
    ),
    -- Financial data based on invoices and their invoice_date
    invoice_financials AS (
        SELECT 
            i.id as invoice_id,
            i.contract_id,
            i.invoice_type,
            EXTRACT(month FROM COALESCE(i.invoice_date, i.created_at)) as month_num,
            -- Invoice amount is the revenue (CA) - MOINS les montants crédités
            COALESCE(i.amount, 0) - COALESCE(i.credited_amount, 0) as revenue,
            -- Achats pour factures de LEASING (via contract_equipment)
            CASE 
                WHEN i.contract_id IS NOT NULL THEN
                    COALESCE((
                        SELECT SUM(ce.purchase_price * ce.quantity)
                        FROM contract_equipment ce 
                        WHERE ce.contract_id = i.contract_id
                    ), 0)
                -- Achats pour factures d'ACHAT (via billing_data JSONB)
                ELSE
                    COALESCE((
                        SELECT SUM(
                            (eq->>'purchase_price')::numeric * 
                            COALESCE((eq->>'quantity')::numeric, 1)
                        )
                        FROM jsonb_array_elements(i.billing_data->'equipment_data') as eq
                    ), 0)
            END as purchases
        FROM invoices i
        WHERE i.company_id = user_company_id 
            AND EXTRACT(year FROM COALESCE(i.invoice_date, i.created_at)) = current_year
    ),
    invoice_data AS (
        SELECT 
            inf.month_num,
            COUNT(DISTINCT inf.invoice_id) as invoices_count,
            COUNT(DISTINCT inf.contract_id) as contracts_count,
            SUM(inf.revenue) as total_revenue,
            SUM(inf.purchases) as total_purchases
        FROM invoice_financials inf
        GROUP BY inf.month_num
    )
    SELECT 
        TRIM(m.month_name) as month_name,
        m.month_num as month_number,
        current_year as year,
        COALESCE(id.total_revenue, 0) as revenue,
        COALESCE(id.total_purchases, 0) as purchases,
        COALESCE(id.total_revenue, 0) - COALESCE(id.total_purchases, 0) as margin,
        CASE 
            WHEN COALESCE(id.total_revenue, 0) > 0 
            THEN ROUND(
                ((COALESCE(id.total_revenue, 0) - COALESCE(id.total_purchases, 0)) * 100.0 / 
                 COALESCE(id.total_revenue, 0)), 1
            )
            ELSE 0
        END as margin_percentage,
        COALESCE(id.contracts_count, 0)::INTEGER as contracts_count,
        0::INTEGER as offers_count
    FROM months m
    LEFT JOIN invoice_data id ON m.month_num = id.month_num
    ORDER BY m.month_num;
END;
$function$;