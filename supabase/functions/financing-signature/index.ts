// @ts-nocheck
// financing-signature : lancement du pack contractuel d'une demande de
// financement acceptée (module financeur Winlease, Phase 3).
//
// Le partenaire (ou l'admin financeur) renseigne le signataire final →
//  - création du contrat depuis l'offre (numérotation self-leasing, équipements copiés)
//  - création de la cérémonie de signature séquentielle :
//      1. client final  (lien de signature public existant /contract/:token/sign)
//      2. partenaire fournisseur (contre-signature portail partenaire)
//      3. financeur (contre-signature admin, signataire du registre authorized_signers)
//  - email au signataire final avec le lien (partenaire en copie)
//
// Provider 'internal' (signature électronique maison). La bascule OKSign/itsme
// (signature qualifiée) se fera au niveau de la cérémonie (provider='oksign').
//
// Actions : start {offerId, signatory{first_name,last_name,email,phone}} | resend {ceremonyId}
//         | finalize {ceremonyId} (régénère le PDF avec les 3 signatures + email aux parties)
//         | remind_pending (cron quotidien : relances auto + finalisation de rattrapage)
import { requireElevatedAccess } from "../_shared/security.ts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API') || Deno.env.get('RESEND_API_KEY');
const PUBLIC_BASE_URL = Deno.env.get('PUBLIC_APP_URL') || 'https://leazr.co';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const ACCEPTED_STATUSES = ['internal_approved', 'leaser_approved', 'approved', 'accepted', 'validated'];

const REMINDER_INTERVAL_DAYS = 3;
const MAX_REMINDERS = 3;

async function sendResendEmail(payload: Record<string, unknown>) {
  if (!RESEND_API_KEY) throw new Error('ITAKECARE_RESEND_API non configurée');
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Envoi email échoué: ${t.slice(0, 300)}`);
  }
}

// Email de relance/notification pour un contre-signataire (partenaire ou financeur)
async function sendCounterSignEmail(opts: {
  to: string;
  role: 'partner' | 'financeur';
  signerName: string;
  companyName: string;
  clientName: string | null;
  contractNumber: string | null;
  actionUrl: string;
}) {
  const { to, role, signerName, companyName, clientName, contractNumber, actionUrl } = opts;
  const who = role === 'partner' ? 'fournisseur/partenaire' : 'financeur';
  const html = `
<div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <h2 style="color: #0f172a;">Contre-signature attendue</h2>
  <p>Bonjour ${signerName.split(' ')[0] || ''},</p>
  <p>Le contrat de financement${contractNumber ? ` <strong>${contractNumber}</strong>` : ''}${clientName ? ` de <strong>${clientName}</strong>` : ''} attend votre contre-signature en tant que ${who}.</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${actionUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Contre-signer le contrat
    </a>
  </p>
  <p style="font-size: 12px; color: #94a3b8;">Si le bouton ne fonctionne pas, copiez ce lien : ${actionUrl}</p>
</div>`;
  await sendResendEmail({
    from: `${companyName} <noreply@itakecare.be>`,
    to: [to],
    subject: `${companyName} — contrat${contractNumber ? ` ${contractNumber}` : ''} à contre-signer`,
    html,
  });
}

// Email final : contrat entièrement signé, PDF disponible
async function sendCompletedEmail(opts: {
  to: string[];
  companyName: string;
  contractNumber: string | null;
  pdfUrl: string | null;
}) {
  const { to, companyName, contractNumber, pdfUrl } = opts;
  const html = `
<div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <h2 style="color: #0f172a;">Contrat entièrement signé ✅</h2>
  <p>Le contrat de financement${contractNumber ? ` <strong>${contractNumber}</strong>` : ''} a été signé par les trois parties (client, fournisseur et ${companyName}).</p>
  ${pdfUrl ? `<p style="text-align: center; margin: 28px 0;">
    <a href="${pdfUrl}" style="background: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Télécharger le contrat signé (PDF)
    </a>
  </p>` : ''}
  <p style="font-size: 13px; color: #64748b;">Conservez ce document : il fait foi entre les parties.</p>
</div>`;
  await sendResendEmail({
    from: `${companyName} <noreply@itakecare.be>`,
    to,
    subject: `${companyName} — contrat${contractNumber ? ` ${contractNumber}` : ''} signé par toutes les parties`,
    html,
  });
}

// Régénère le PDF signé (avec les contre-signatures) puis le distribue.
// Retourne l'URL du PDF ou null.
async function finalizeCeremony(supabase: any, ceremony: any): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const resp = await fetch(`${supabaseUrl}/functions/v1/generate-signed-contract-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({ contractId: ceremony.contract_id, action: 'upload' }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Régénération PDF échouée: ${t.slice(0, 300)}`);
  }
  const { url: pdfUrl } = await resp.json();

  const { data: contract } = await supabase
    .from('contracts')
    .select('contract_number')
    .eq('id', ceremony.contract_id)
    .single();
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', ceremony.company_id)
    .single();
  const { data: signers } = await supabase
    .from('signature_ceremony_signers')
    .select('email')
    .eq('ceremony_id', ceremony.id);

  const recipients = [...new Set((signers || []).map((s: any) => s.email).filter(Boolean))] as string[];
  if (recipients.length) {
    try {
      await sendCompletedEmail({
        to: recipients,
        companyName: company?.name || 'Votre financeur',
        contractNumber: contract?.contract_number || null,
        pdfUrl: pdfUrl || null,
      });
    } catch (e) {
      console.error('Email contrat signé non envoyé:', e);
    }
  }

  await supabase
    .from('signature_ceremonies')
    .update({ final_pdf_generated_at: new Date().toISOString() })
    .eq('id', ceremony.id);

  return pdfUrl || null;
}

async function sendSignatureEmail(opts: {
  to: string;
  cc?: string | null;
  signerFirstName: string;
  companyName: string;
  contractNumber: string | null;
  monthlyPayment: number | null;
  duration: number | null;
  signUrl: string;
}) {
  if (!RESEND_API_KEY) throw new Error('ITAKECARE_RESEND_API non configurée');
  const { to, cc, signerFirstName, companyName, contractNumber, monthlyPayment, duration, signUrl } = opts;

  const html = `
<div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <h2 style="color: #0f172a;">Votre contrat de financement est prêt à signer</h2>
  <p>Bonjour ${signerFirstName},</p>
  <p>Votre demande de financement a été <strong>acceptée</strong> par ${companyName}.
  Votre contrat${contractNumber ? ` <strong>${contractNumber}</strong>` : ''} est prêt :
  ${monthlyPayment != null ? `<strong>${Number(monthlyPayment).toFixed(2)} €/mois</strong>` : ''}${duration ? ` sur <strong>${duration} mois</strong>` : ''}.</p>
  <p>Pour le consulter et le signer électroniquement, cliquez sur le bouton ci-dessous :</p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${signUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Consulter et signer mon contrat
    </a>
  </p>
  <p style="font-size: 13px; color: #64748b;">Après votre signature, le fournisseur de l'équipement puis ${companyName} contre-signeront le contrat. Vous recevrez le document signé par email.</p>
  <p style="font-size: 12px; color: #94a3b8;">Si le bouton ne fonctionne pas, copiez ce lien : ${signUrl}</p>
</div>`;

  const payload: any = {
    from: `${companyName} <noreply@itakecare.be>`,
    to: [to],
    subject: `${companyName} — votre contrat de financement est prêt à signer`,
    html,
  };
  if (cc && cc !== to) payload.cc = [cc];

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Envoi email échoué: ${t.slice(0, 300)}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin', 'partner'],
      rateLimit: {
        endpoint: 'financing-signature',
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: 'financing-signature',
      },
    });
    if (!access.ok) return access.response;

    const supabase = access.context.supabaseAdmin;
    const body = await req.json();
    const action = body?.action || 'start';

    // ── Relance : renvoyer le lien au signataire de l'étape courante ──
    if (action === 'resend') {
      const { ceremonyId } = body;
      const { data: ceremony } = await supabase
        .from('signature_ceremonies')
        .select('id, company_id, contract_id, offer_id, current_step, status')
        .eq('id', ceremonyId)
        .maybeSingle();
      if (!ceremony) return json({ success: false, error: 'Cérémonie introuvable' }, 404);
      if (ceremony.status !== 'in_progress') return json({ success: false, error: 'Cérémonie non active' }, 400);

      const { data: signer } = await supabase
        .from('signature_ceremony_signers')
        .select('*')
        .eq('ceremony_id', ceremony.id)
        .eq('step_order', ceremony.current_step)
        .maybeSingle();
      if (!signer?.email) return json({ success: false, error: 'Signataire courant sans email' }, 400);

      const { data: contract } = await supabase
        .from('contracts')
        .select('contract_signature_token, contract_number, monthly_payment, contract_duration, company_id')
        .eq('id', ceremony.contract_id)
        .single();
      const { data: company } = await supabase
        .from('companies')
        .select('name, slug')
        .eq('id', ceremony.company_id)
        .single();

      const signUrl = `${PUBLIC_BASE_URL}/${company.slug}/contract/${contract.contract_signature_token}/sign`;
      await sendSignatureEmail({
        to: signer.email,
        signerFirstName: signer.name?.split(' ')[0] || '',
        companyName: company.name,
        contractNumber: contract.contract_number,
        monthlyPayment: contract.monthly_payment,
        duration: contract.contract_duration,
        signUrl,
      });
      await supabase
        .from('signature_ceremony_signers')
        .update({ status: signer.status === 'pending' ? 'notified' : signer.status, last_reminded_at: new Date().toISOString() })
        .eq('id', signer.id);
      return json({ success: true });
    }

    // ── Finalisation : PDF avec les 3 signatures + email aux parties ──
    if (action === 'finalize') {
      const { ceremonyId } = body;
      const { data: ceremony } = await supabase
        .from('signature_ceremonies')
        .select('id, company_id, contract_id, status, final_pdf_generated_at')
        .eq('id', ceremonyId)
        .maybeSingle();
      if (!ceremony) return json({ success: false, error: 'Cérémonie introuvable' }, 404);
      if (ceremony.status !== 'completed') return json({ success: false, error: 'Cérémonie non terminée' }, 400);
      if (!ceremony.contract_id) return json({ success: false, error: 'Cérémonie sans contrat' }, 400);

      const pdfUrl = await finalizeCeremony(supabase, ceremony);
      return json({ success: true, pdf_url: pdfUrl });
    }

    // ── Cron quotidien : relances + finalisation de rattrapage ──
    if (action === 'remind_pending') {
      if (!access.context.isServiceRole && !['admin', 'super_admin'].includes(access.context.role)) {
        return json({ success: false, error: 'Réservé au cron ou aux admins' }, 403);
      }

      const cutoff = new Date(Date.now() - REMINDER_INTERVAL_DAYS * 24 * 3600 * 1000).toISOString();
      const results = { reminded: 0, finalized: 0, skipped: 0, errors: [] as string[] };

      const { data: ceremonies } = await supabase
        .from('signature_ceremonies')
        .select('id, company_id, contract_id, offer_id, current_step, status, final_pdf_generated_at')
        .eq('document_type', 'contract')
        .in('status', ['in_progress', 'completed']);

      for (const ceremony of ceremonies || []) {
        try {
          // Rattrapage : cérémonie terminée sans PDF final régénéré
          if (ceremony.status === 'completed') {
            if (!ceremony.final_pdf_generated_at && ceremony.contract_id) {
              await finalizeCeremony(supabase, ceremony);
              results.finalized++;
            }
            continue;
          }

          const { data: signer } = await supabase
            .from('signature_ceremony_signers')
            .select('*')
            .eq('ceremony_id', ceremony.id)
            .eq('step_order', ceremony.current_step)
            .maybeSingle();
          if (!signer || signer.status === 'signed' || signer.status === 'refused' || !signer.email) {
            results.skipped++;
            continue;
          }
          if (signer.reminder_count >= MAX_REMINDERS) { results.skipped++; continue; }
          if (signer.last_reminded_at && signer.last_reminded_at > cutoff) { results.skipped++; continue; }

          const { data: contract } = await supabase
            .from('contracts')
            .select('contract_signature_token, contract_number, monthly_payment, contract_duration, client_name')
            .eq('id', ceremony.contract_id)
            .single();
          const { data: company } = await supabase
            .from('companies')
            .select('name, slug')
            .eq('id', ceremony.company_id)
            .single();

          if (signer.role === 'client') {
            await sendSignatureEmail({
              to: signer.email,
              signerFirstName: signer.name?.split(' ')[0] || '',
              companyName: company.name,
              contractNumber: contract.contract_number,
              monthlyPayment: contract.monthly_payment,
              duration: contract.contract_duration,
              signUrl: `${PUBLIC_BASE_URL}/${company.slug}/contract/${contract.contract_signature_token}/sign`,
            });
          } else {
            const actionUrl = signer.role === 'partner'
              ? `${PUBLIC_BASE_URL}/${company.slug}/partenaire/requests/${ceremony.offer_id}`
              : `${PUBLIC_BASE_URL}/${company.slug}/financeur/offers/${ceremony.offer_id}`;
            await sendCounterSignEmail({
              to: signer.email,
              role: signer.role,
              signerName: signer.name || '',
              companyName: company.name,
              clientName: contract.client_name,
              contractNumber: contract.contract_number,
              actionUrl,
            });
          }

          await supabase
            .from('signature_ceremony_signers')
            .update({
              status: signer.status === 'pending' ? 'notified' : signer.status,
              last_reminded_at: new Date().toISOString(),
              reminder_count: (signer.reminder_count || 0) + 1,
            })
            .eq('id', signer.id);
          results.reminded++;
        } catch (e) {
          console.error(`Relance cérémonie ${ceremony.id} échouée:`, e);
          results.errors.push(`${ceremony.id}: ${(e as Error).message}`);
        }
      }

      console.log('remind_pending:', JSON.stringify(results));
      return json({ success: true, ...results });
    }

    // ── Lancement du pack contractuel ──
    const { offerId, signatory } = body;
    if (!offerId || !signatory?.email || !signatory?.first_name || !signatory?.last_name) {
      return json({ success: false, error: 'offerId et signatory {first_name, last_name, email} requis' }, 400);
    }

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();
    if (offerError || !offer) return json({ success: false, error: 'Offre introuvable' }, 404);
    if (offer.type !== 'financing_request') {
      return json({ success: false, error: 'Réservé aux demandes de financement' }, 400);
    }
    if (!ACCEPTED_STATUSES.includes(offer.workflow_status)) {
      return json({ success: false, error: `La demande doit être acceptée (statut actuel : ${offer.workflow_status})` }, 400);
    }

    // Autorisation : admin de la société OU partenaire apporteur de la demande
    const isAdmin = ['admin', 'super_admin'].includes(access.context.role) &&
      (access.context.isServiceRole || access.context.role === 'super_admin' || access.context.companyId === offer.company_id);
    let isOwnerPartner = false;
    if (!isAdmin && access.context.userId) {
      const { data: fp } = await supabase
        .from('financing_partners')
        .select('id')
        .eq('user_id', access.context.userId)
        .eq('status', 'active')
        .maybeSingle();
      isOwnerPartner = !!fp && fp.id === offer.financing_partner_id;
    }
    if (!isAdmin && !isOwnerPartner) {
      return json({ success: false, error: 'Non autorisé sur cette demande' }, 403);
    }

    // Une seule cérémonie de contrat active par offre
    const { data: existing } = await supabase
      .from('signature_ceremonies')
      .select('id, status')
      .eq('offer_id', offerId)
      .eq('document_type', 'contract')
      .in('status', ['in_progress', 'completed'])
      .maybeSingle();
    if (existing) {
      return json({ success: false, error: 'Une cérémonie de signature existe déjà pour cette demande' }, 409);
    }

    // ── Contrat ──
    const { data: contractNumber } = await supabase.rpc('generate_self_leasing_contract_number', {
      p_company_id: offer.company_id,
    });

    const signerFullName = `${signatory.first_name} ${signatory.last_name}`.trim();

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        offer_id: offer.id,
        company_id: offer.company_id,
        client_id: offer.client_id,
        user_id: offer.user_id,
        client_name: offer.client_name,
        client_email: signatory.email,
        leaser_name: null,
        monthly_payment: offer.monthly_payment,
        contract_duration: offer.duration || 36,
        equipment_description: offer.equipment_description,
        status: 'contract_sent',
        signature_status: 'draft',
        is_self_leasing: true,
        contract_number: contractNumber || null,
        tracking_number: contractNumber || `CTR-${Date.now().toString(36).toUpperCase()}`,
      })
      .select('id, contract_signature_token, contract_number')
      .single();
    if (contractError) {
      console.error('Erreur création contrat:', contractError);
      return json({ success: false, error: `Création du contrat impossible: ${contractError.message}` }, 500);
    }

    // Équipements
    const { data: offerEquipment } = await supabase
      .from('offer_equipment')
      .select('title, quantity, purchase_price, margin, monthly_payment')
      .eq('offer_id', offer.id);
    if (offerEquipment?.length) {
      await supabase.from('contract_equipment').insert(
        offerEquipment.map((eq: any) => ({
          contract_id: contract.id,
          title: eq.title,
          quantity: eq.quantity,
          purchase_price: eq.purchase_price,
          margin: eq.margin,
          monthly_payment: eq.monthly_payment,
        }))
      );
    }

    // Signataire final tracé sur l'offre
    await supabase.from('offers').update({ financing_signatory: signatory }).eq('id', offer.id);

    // ── Cérémonie + signataires ──
    const { data: ceremony, error: ceremonyError } = await supabase
      .from('signature_ceremonies')
      .insert({
        company_id: offer.company_id,
        offer_id: offer.id,
        contract_id: contract.id,
        document_type: 'contract',
        provider: 'internal',
        status: 'in_progress',
        current_step: 1,
      })
      .select('id')
      .single();
    if (ceremonyError) {
      console.error('Erreur création cérémonie:', ceremonyError);
      return json({ success: false, error: ceremonyError.message }, 500);
    }

    // Partenaire (étape 2)
    let partner: any = null;
    if (offer.financing_partner_id) {
      const { data } = await supabase
        .from('financing_partners')
        .select('name, contact_name, email, phone')
        .eq('id', offer.financing_partner_id)
        .maybeSingle();
      partner = data;
    }

    // Financeur (étape 3) : signataire par défaut du registre, sinon représentant société
    const { data: defaultSigner } = await supabase
      .from('authorized_signers')
      .select('name, title, email, phone')
      .eq('company_id', offer.company_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: company } = await supabase
      .from('companies')
      .select('name, slug, signature_representative_name')
      .eq('id', offer.company_id)
      .single();

    const signers = [
      {
        ceremony_id: ceremony.id,
        step_order: 1,
        role: 'client',
        name: signerFullName,
        email: signatory.email,
        phone: signatory.phone || null,
        status: 'pending',
      },
      {
        ceremony_id: ceremony.id,
        step_order: 2,
        role: 'partner',
        name: partner?.contact_name || partner?.name || 'Partenaire',
        email: partner?.email || null,
        phone: partner?.phone || null,
        status: 'pending',
      },
      {
        ceremony_id: ceremony.id,
        step_order: 3,
        role: 'financeur',
        name: defaultSigner?.name || company?.signature_representative_name || company?.name || 'Financeur',
        email: defaultSigner?.email || null,
        phone: defaultSigner?.phone || null,
        status: 'pending',
      },
    ];
    const { error: signersError } = await supabase.from('signature_ceremony_signers').insert(signers);
    if (signersError) {
      console.error('Erreur création signataires:', signersError);
      return json({ success: false, error: signersError.message }, 500);
    }

    // ── Email au signataire final (partenaire en copie) ──
    const signUrl = `${PUBLIC_BASE_URL}/${company.slug}/contract/${contract.contract_signature_token}/sign`;
    try {
      await sendSignatureEmail({
        to: signatory.email,
        cc: partner?.email || null,
        signerFirstName: signatory.first_name,
        companyName: company.name,
        contractNumber: contract.contract_number,
        monthlyPayment: offer.monthly_payment,
        duration: offer.duration,
        signUrl,
      });
      await supabase
        .from('signature_ceremony_signers')
        .update({ status: 'notified', last_reminded_at: new Date().toISOString() })
        .eq('ceremony_id', ceremony.id)
        .eq('step_order', 1);
    } catch (emailError) {
      console.error('Email de signature non envoyé:', emailError);
      // La cérémonie existe ; le lien peut être renvoyé via action 'resend'
    }

    return json({
      success: true,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      ceremony_id: ceremony.id,
      sign_url: signUrl,
    });
  } catch (error) {
    console.error('financing-signature error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
};

Deno.serve(handler);
