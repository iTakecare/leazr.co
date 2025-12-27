-- Drop the ambiguous TEXT version of get_contract_for_signature
DROP FUNCTION IF EXISTS public.get_contract_for_signature(text);

-- Update the UUID version to remove self-leasing restriction
CREATE OR REPLACE FUNCTION public.get_contract_for_signature(p_signature_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'id', c.id,
        'offer_id', c.offer_id,
        'client_name', c.client_name,
        'client_email', c.client_email,
        'leaser_name', c.leaser_name,
        'monthly_payment', c.monthly_payment,
        'contract_duration', c.contract_duration,
        'signature_status', c.signature_status,
        'is_self_leasing', c.is_self_leasing,
        'company_id', c.company_id,
        'company', (
            SELECT json_build_object(
                'id', comp.id,
                'name', comp.name,
                'logo_url', comp.logo_url
            )
            FROM companies comp
            WHERE comp.id = c.company_id
        ),
        'equipment', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', ce.id,
                    'title', ce.title,
                    'quantity', ce.quantity,
                    'purchase_price', ce.purchase_price,
                    'margin', ce.margin,
                    'monthly_payment', ce.monthly_payment
                )
            ), '[]'::json)
            FROM contract_equipment ce
            WHERE ce.contract_id = c.id
        )
    ) INTO result
    FROM contracts c
    WHERE c.contract_signature_token = p_signature_token
      AND COALESCE(c.signature_status, 'pending_signature') IN ('pending_signature', 'draft');

    RETURN result;
END;
$$;

-- Ensure public access for signature page
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_contract_for_signature(uuid) TO authenticated;