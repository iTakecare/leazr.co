-- WINLEASE PHASE 3 : pack contractuel & séquence de signatures
-- Cérémonie de signature séquentielle (client final → partenaire fournisseur →
-- financeur) sur le contrat généré depuis une demande acceptée.
-- Provider 'internal' = signature électronique maison (token public + canvas,
-- infrastructure existante) ; 'oksign' = signature qualifiée itsme (dès credentials).

-- 1. Registre des signataires autorisés du financeur (gérant ou délégués avec
--    pouvoir de signature)
CREATE TABLE IF NOT EXISTS public.authorized_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  is_default boolean NOT NULL DEFAULT false,
  power_of_attorney_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_authorized_signers_company ON public.authorized_signers(company_id);

-- 2. Cérémonies de signature
CREATE TABLE IF NOT EXISTS public.signature_ceremonies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'contract'
    CHECK (document_type IN ('contract', 'sepa_mandate', 'guarantee', 'delivery_note')),
  provider text NOT NULL DEFAULT 'internal' CHECK (provider IN ('internal', 'oksign')),
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  current_step integer NOT NULL DEFAULT 1,
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signature_ceremonies_company ON public.signature_ceremonies(company_id);
CREATE INDEX IF NOT EXISTS idx_signature_ceremonies_offer ON public.signature_ceremonies(offer_id);
CREATE INDEX IF NOT EXISTS idx_signature_ceremonies_contract ON public.signature_ceremonies(contract_id);

CREATE TABLE IF NOT EXISTS public.signature_ceremony_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id uuid NOT NULL REFERENCES public.signature_ceremonies(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  role text NOT NULL CHECK (role IN ('client', 'partner', 'financeur')),
  name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'signed', 'refused')),
  signed_at timestamptz,
  signature_data text,
  signer_ip text,
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ceremony_signers_ceremony ON public.signature_ceremony_signers(ceremony_id);

-- 3. Signataire final saisi par le partenaire, tracé sur l'offre
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS financing_signatory jsonb;

-- 4. RLS
ALTER TABLE public.authorized_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_ceremony_signers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authorized_signers_company_all ON public.authorized_signers;
CREATE POLICY authorized_signers_company_all ON public.authorized_signers
  FOR ALL USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
DROP POLICY IF EXISTS zzz_block_clients ON public.authorized_signers;
CREATE POLICY zzz_block_clients ON public.authorized_signers AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_client_user());
DROP POLICY IF EXISTS zzz_block_financing_partners ON public.authorized_signers;
CREATE POLICY zzz_block_financing_partners ON public.authorized_signers AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_financing_partner_user());

DROP POLICY IF EXISTS signature_ceremonies_company_all ON public.signature_ceremonies;
CREATE POLICY signature_ceremonies_company_all ON public.signature_ceremonies
  FOR ALL USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- Le partenaire voit les cérémonies de SES demandes (lecture seule)
DROP POLICY IF EXISTS signature_ceremonies_partner_select ON public.signature_ceremonies;
CREATE POLICY signature_ceremonies_partner_select ON public.signature_ceremonies
  FOR SELECT TO authenticated
  USING (
    offer_id IN (
      SELECT o.id FROM public.offers o
      WHERE o.financing_partner_id = public.get_financing_partner_id()
    )
  );
DROP POLICY IF EXISTS zzz_block_clients ON public.signature_ceremonies;
CREATE POLICY zzz_block_clients ON public.signature_ceremonies AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_client_user());
DROP POLICY IF EXISTS zzz_block_financing_partners ON public.signature_ceremonies;
CREATE POLICY zzz_block_financing_partners ON public.signature_ceremonies AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    NOT public.is_financing_partner_user()
    OR offer_id IN (
      SELECT o.id FROM public.offers o
      WHERE o.financing_partner_id = public.get_financing_partner_id()
    )
  );

DROP POLICY IF EXISTS ceremony_signers_company_all ON public.signature_ceremony_signers;
CREATE POLICY ceremony_signers_company_all ON public.signature_ceremony_signers
  FOR ALL USING (
    ceremony_id IN (SELECT c.id FROM public.signature_ceremonies c WHERE c.company_id = public.get_user_company_id())
  )
  WITH CHECK (
    ceremony_id IN (SELECT c.id FROM public.signature_ceremonies c WHERE c.company_id = public.get_user_company_id())
  );
DROP POLICY IF EXISTS ceremony_signers_partner_select ON public.signature_ceremony_signers;
CREATE POLICY ceremony_signers_partner_select ON public.signature_ceremony_signers
  FOR SELECT TO authenticated
  USING (
    ceremony_id IN (
      SELECT c.id FROM public.signature_ceremonies c
      JOIN public.offers o ON c.offer_id = o.id
      WHERE o.financing_partner_id = public.get_financing_partner_id()
    )
  );
DROP POLICY IF EXISTS zzz_block_clients ON public.signature_ceremony_signers;
CREATE POLICY zzz_block_clients ON public.signature_ceremony_signers AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_client_user());
DROP POLICY IF EXISTS zzz_block_financing_partners ON public.signature_ceremony_signers;
CREATE POLICY zzz_block_financing_partners ON public.signature_ceremony_signers AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    NOT public.is_financing_partner_user()
    OR ceremony_id IN (
      SELECT c.id FROM public.signature_ceremonies c
      JOIN public.offers o ON c.offer_id = o.id
      WHERE o.financing_partner_id = public.get_financing_partner_id()
    )
  );

-- 5. Progression automatique : quand le CLIENT signe le contrat via la page
--    publique (sign_contract_public → contract_signed_at), marquer l'étape 1
--    de la cérémonie liée et passer à l'étape suivante.
CREATE OR REPLACE FUNCTION public.sync_contract_signature_to_ceremony()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ceremony RECORD;
BEGIN
  IF NEW.contract_signed_at IS NOT NULL AND (OLD.contract_signed_at IS NULL OR OLD.contract_signed_at IS DISTINCT FROM NEW.contract_signed_at) THEN
    FOR v_ceremony IN
      SELECT c.id, c.current_step FROM signature_ceremonies c
      WHERE c.contract_id = NEW.id AND c.document_type = 'contract' AND c.status = 'in_progress'
    LOOP
      UPDATE signature_ceremony_signers s
      SET status = 'signed',
          signed_at = NEW.contract_signed_at,
          signature_data = COALESCE(s.signature_data, NEW.contract_signature_data),
          signer_ip = COALESCE(s.signer_ip, NEW.contract_signer_ip)
      WHERE s.ceremony_id = v_ceremony.id
        AND s.role = 'client'
        AND s.status <> 'signed';

      -- Avancer au prochain signataire non signé
      UPDATE signature_ceremonies c
      SET current_step = COALESCE(
            (SELECT MIN(s.step_order) FROM signature_ceremony_signers s
             WHERE s.ceremony_id = c.id AND s.status <> 'signed'),
            c.current_step
          ),
          status = CASE WHEN NOT EXISTS (
            SELECT 1 FROM signature_ceremony_signers s
            WHERE s.ceremony_id = c.id AND s.status <> 'signed'
          ) THEN 'completed' ELSE c.status END,
          updated_at = now()
      WHERE c.id = v_ceremony.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_contract_signature_to_ceremony ON public.contracts;
CREATE TRIGGER trg_sync_contract_signature_to_ceremony
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contract_signature_to_ceremony();

-- 6. Contre-signature d'une étape (partenaire depuis son portail, financeur
--    depuis l'admin) — vérifie que l'appelant est bien le signataire de
--    l'étape courante.
CREATE OR REPLACE FUNCTION public.sign_financing_ceremony_step(
  p_ceremony_id uuid,
  p_signature_data text,
  p_signer_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ceremony signature_ceremonies%ROWTYPE;
  v_signer signature_ceremony_signers%ROWTYPE;
  v_offer offers%ROWTYPE;
  v_is_partner boolean;
  v_is_company_admin boolean;
BEGIN
  SELECT * INTO v_ceremony FROM signature_ceremonies WHERE id = p_ceremony_id;
  IF v_ceremony.id IS NULL THEN
    RAISE EXCEPTION 'Cérémonie introuvable';
  END IF;
  IF v_ceremony.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Cérémonie non active (statut %)', v_ceremony.status;
  END IF;

  SELECT * INTO v_signer FROM signature_ceremony_signers
  WHERE ceremony_id = p_ceremony_id AND step_order = v_ceremony.current_step;
  IF v_signer.id IS NULL THEN
    RAISE EXCEPTION 'Aucun signataire pour l''étape courante';
  END IF;
  IF v_signer.status = 'signed' THEN
    RAISE EXCEPTION 'Étape déjà signée';
  END IF;
  IF v_signer.role = 'client' THEN
    RAISE EXCEPTION 'La signature du client final passe par son lien de signature personnel';
  END IF;

  SELECT * INTO v_offer FROM offers WHERE id = v_ceremony.offer_id;

  -- Autorisation
  IF v_signer.role = 'partner' THEN
    SELECT EXISTS (
      SELECT 1 FROM financing_partners fp
      WHERE fp.user_id = auth.uid() AND fp.status = 'active'
        AND fp.id = v_offer.financing_partner_id
    ) INTO v_is_partner;
    IF NOT v_is_partner THEN
      RAISE EXCEPTION 'Seul le partenaire apporteur peut contre-signer cette étape';
    END IF;
  ELSIF v_signer.role = 'financeur' THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.company_id = v_ceremony.company_id
        AND p.role IN ('admin', 'super_admin')
    ) INTO v_is_company_admin;
    IF NOT v_is_company_admin THEN
      RAISE EXCEPTION 'Seul un membre de l''équipe du financeur peut contre-signer cette étape';
    END IF;
  END IF;

  UPDATE signature_ceremony_signers
  SET status = 'signed',
      signed_at = now(),
      signature_data = p_signature_data,
      name = COALESCE(p_signer_name, name)
  WHERE id = v_signer.id;

  UPDATE signature_ceremonies c
  SET current_step = COALESCE(
        (SELECT MIN(s.step_order) FROM signature_ceremony_signers s
         WHERE s.ceremony_id = c.id AND s.status <> 'signed'),
        c.current_step
      ),
      status = CASE WHEN NOT EXISTS (
        SELECT 1 FROM signature_ceremony_signers s
        WHERE s.ceremony_id = c.id AND s.status <> 'signed'
      ) THEN 'completed' ELSE c.status END,
      updated_at = now()
  WHERE c.id = p_ceremony_id;

  SELECT * INTO v_ceremony FROM signature_ceremonies WHERE id = p_ceremony_id;

  -- Contrat entièrement signé → statut contract_signed
  IF v_ceremony.status = 'completed' AND v_ceremony.contract_id IS NOT NULL THEN
    UPDATE contracts SET status = 'contract_signed', updated_at = now()
    WHERE id = v_ceremony.contract_id AND status IN ('contract_sent', 'pending');
  END IF;

  RETURN jsonb_build_object(
    'ceremony_status', v_ceremony.status,
    'current_step', v_ceremony.current_step
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.sign_financing_ceremony_step(uuid, text, text) TO authenticated;
