-- ============================================================================
-- Certificat de signature électronique de l'offre
--
-- Constat avant correction : `signer_ip` était systématiquement NULL. Le hook
-- de signature appelait saveOfferSignature(..., undefined) avec le commentaire
-- « IP sera collectée côté serveur si nécessaire » — ce qui n'a jamais été fait.
-- Sur la seule offre signée en production, l'IP est vide.
--
-- Deux ajouts pour donner une vraie valeur probante au certificat :
--   * signer_user_agent : navigateur et appareil du signataire
--   * signature_payload_hash : empreinte SHA-256 de CE QUI a été signé
--     (montants, durée, équipements). Sans elle, un certificat prouve qu'on a
--     signé, pas ce qu'on a signé — l'offre pourrait être modifiée après coup
--     sans que rien ne le trahisse.
--   * signature_certificate_id : référence lisible imprimée sur le certificat
--
-- L'IP et le user-agent sont désormais lus côté serveur par l'edge `sign-offer`
-- (en-têtes x-forwarded-for), donc non falsifiables par le navigateur.
-- ============================================================================

-- @@SPLIT@@
alter table public.offers
  add column if not exists signer_user_agent       text,
  add column if not exists signature_payload_hash  text,
  add column if not exists signature_certificate_id text;

-- @@SPLIT@@
-- RPC de signature publique : accepte les nouveaux champs probants.
-- Les paramètres restent optionnels — un appel legacy continue de fonctionner.
create or replace function public.sign_offer_public(
  p_offer_id uuid,
  p_signature_data text,
  p_signer_name text,
  p_signer_ip text default null,
  p_signer_user_agent text default null,
  p_payload_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  current_status text;
  now_timestamp  timestamptz;
  v_certificate  text;
  v_dossier      text;
begin
  now_timestamp := now();

  select workflow_status, dossier_number into current_status, v_dossier
    from public.offers
   where id = p_offer_id;

  if not found then
    raise exception 'Offre non trouvée avec l''ID: %', p_offer_id;
  end if;

  if current_status = 'approved' then
    raise exception 'Cette offre est déjà signée';
  end if;

  if p_signature_data is null or p_signature_data = '' or p_signature_data not like 'data:image/%' then
    raise exception 'Données de signature invalides';
  end if;

  if p_signer_name is null or trim(p_signer_name) = '' then
    raise exception 'Le nom du signataire est requis';
  end if;

  -- Référence lisible du certificat : SIG-<dossier ou id court>-<AAAAMMJJ>
  v_certificate := 'SIG-'
    || coalesce(v_dossier, upper(substr(p_offer_id::text, 1, 8)))
    || '-' || to_char(now_timestamp, 'YYYYMMDD');

  update public.offers
     set workflow_status = 'approved',
         signature_data = p_signature_data,
         signer_name = trim(p_signer_name),
         signed_at = now_timestamp,
         signer_ip = p_signer_ip,
         signer_user_agent = p_signer_user_agent,
         signature_payload_hash = p_payload_hash,
         signature_certificate_id = v_certificate
   where id = p_offer_id;

  return true;
end;
$function$;
