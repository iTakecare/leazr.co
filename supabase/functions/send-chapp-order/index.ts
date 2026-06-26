import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');
// Adresse du fournisseur Chapp. Surchargeable par variable d'environnement,
// sinon valeur par défaut.
const CHAPP_ORDER_EMAIL = Deno.env.get('CHAPP_ORDER_EMAIL') || 'info@chapp.store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChappOrderItem {
  id: string;
  title: string;
  quantity: number;
  supplier_price: number | null;
  order_reference: string | null;
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtPrice = (v: number | null | undefined) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(v);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📦 [SEND-CHAPP-ORDER] Starting');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    // Service-role client (auth verification)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) console.error('[SEND-CHAPP-ORDER] Auth error:', authError);
    if (!user) throw new Error('Unauthorized - User not authenticated');

    const body = await req.json();
    const sourceType: 'offer' | 'contract' = body.sourceType;
    const sourceId: string = body.sourceId;
    const items: ChappOrderItem[] = Array.isArray(body.items) ? body.items : [];
    const note: string = (body.note || '').toString();

    if (!sourceType || !['offer', 'contract'].includes(sourceType)) {
      throw new Error('Invalid sourceType');
    }
    if (!sourceId) throw new Error('Missing sourceId');
    if (items.length === 0) throw new Error('Aucun équipement à commander');

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    // Client RLS-scoped (tenant) : garantit que l'appelant possède bien
    // l'offre/le contrat avant d'envoyer une commande en son nom.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // En-tête (référence dossier + client) + vérification d'appartenance tenant
    let reference = '';
    let clientName = '';
    if (sourceType === 'offer') {
      const { data: offer } = await callerClient
        .from('offers')
        .select('id, dossier_number, offer_number, client_name')
        .eq('id', sourceId)
        .maybeSingle();
      if (!offer) throw new Error('Forbidden - offer not in your tenant');
      reference = offer.dossier_number || offer.offer_number || sourceId;
      clientName = offer.client_name || '';
    } else {
      const { data: contract } = await callerClient
        .from('contracts')
        .select('id, contract_number, client_name')
        .eq('id', sourceId)
        .maybeSingle();
      if (!contract) throw new Error('Forbidden - contract not in your tenant');
      reference = contract.contract_number || sourceId;
      clientName = contract.client_name || '';
    }

    // Specs / attributs par équipement (pour préciser la config à commander)
    const attrTable = sourceType === 'offer'
      ? 'offer_equipment_attributes'
      : 'contract_equipment_attributes';
    const ids = items.map((i) => i.id).filter(Boolean);
    const attrsByEquipment: Record<string, Array<{ key: string; value: string }>> = {};
    if (ids.length > 0) {
      const { data: attrRows } = await callerClient
        .from(attrTable)
        .select('equipment_id, key, value')
        .in('equipment_id', ids);
      for (const r of (attrRows || []) as any[]) {
        if (!r?.equipment_id) continue;
        (attrsByEquipment[r.equipment_id] ||= []).push({ key: r.key, value: r.value });
      }
    }

    // ── Corps de l'email ──
    const rows = items.map((it) => {
      const specs = (attrsByEquipment[it.id] || [])
        .map((a) => `${esc(a.key)}: ${esc(a.value)}`)
        .join(' · ');
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">
            <strong>${esc(it.title)}</strong>
            ${specs ? `<div style="font-size:12px;color:#666;margin-top:2px;">${specs}</div>` : ''}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${esc(it.quantity)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmtPrice(it.supplier_price)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${esc(it.order_reference || '—')}</td>
        </tr>`;
    }).join('');

    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:680px;margin:0 auto;">
        <h2 style="margin:0 0 4px;">Nouvelle commande${clientName ? ` — ${esc(clientName)}` : ''}</h2>
        <p style="margin:0 0 16px;color:#666;">Référence dossier : <strong>${esc(reference)}</strong></p>
        ${note ? `<p style="background:#f6f6f6;border-radius:8px;padding:12px;margin:0 0 16px;white-space:pre-wrap;">${esc(note)}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f3f4f6;text-align:left;">
              <th style="padding:8px 12px;">Équipement</th>
              <th style="padding:8px 12px;text-align:center;">Qté</th>
              <th style="padding:8px 12px;text-align:right;">Prix d'achat</th>
              <th style="padding:8px 12px;">Référence</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:#666;">
          ${items.length} ligne(s) · ${totalQty} unité(s) au total
        </p>
        <p style="margin:24px 0 0;font-size:13px;color:#888;">
          Commande transmise par ${esc(user.email)} via Leazr.
        </p>
      </div>`;

    const subject = `Commande ${reference}${clientName ? ` — ${clientName}` : ''}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'iTakecare <noreply@itakecare.be>',
        to: [CHAPP_ORDER_EMAIL],
        reply_to: [user.email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[SEND-CHAPP-ORDER] Resend error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log('[SEND-CHAPP-ORDER] Email sent:', data?.id);

    return new Response(
      JSON.stringify({ success: true, count: items.length, to: CHAPP_ORDER_EMAIL, reference }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('[SEND-CHAPP-ORDER] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Une erreur est survenue' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
