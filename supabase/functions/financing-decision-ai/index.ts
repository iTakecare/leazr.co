// @ts-nocheck
// financing-decision-ai : recommandation IA de décision pour une demande de
// financement (module financeur Winlease). Analyse le dossier complet — offre,
// équipements, client (KYC), rapport de crédit Creditsafe, encours vs limites,
// partenaire apporteur — et produit une recommandation structurée A/B/C/D
// persistée sur offers.financing_ai_recommendation.
import { requireElevatedAccess } from "../_shared/security.ts";

const ANTHROPIC_MODEL = "claude-opus-5";
const ANTHROPIC_VERSION = "2023-06-01";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    suggested_score: { type: "string", enum: ["A", "B", "C", "D"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    rationale: { type: "string" },
    red_flags: { type: "array", items: { type: "string" } },
    positive_signals: { type: "array", items: { type: "string" } },
    conditions: { type: "array", items: { type: "string" } },
    rejection_category: {
      type: ["string", "null"],
      enum: ["fraud", "young_company", "private_client", "financial_situation", "other", null],
    },
  },
  required: [
    "suggested_score", "confidence", "rationale", "red_flags",
    "positive_signals", "conditions", "rejection_category",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Tu es l'analyste crédit senior d'une société de financement d'équipements B2B (leasing/location financière) opérant en Belgique, France et Luxembourg. Tu analyses des demandes de financement apportées par des partenaires (fournisseurs d'équipement) et brokers.

Grille de décision :
- A = ACCEPTATION : dossier sain, financement accordé.
- B = ACCEPTATION CONDITIONNELLE : dossier acceptable moyennant conditions (documents complémentaires : bilans, extraits de compte ; caution personnelle du dirigeant ; acompte). Liste les conditions concrètes dans "conditions".
- C = REFUS : risque trop élevé. Renseigne "rejection_category" et détaille le motif dans "rationale".
- D = SANS SUITE : dossier non exploitable (données incohérentes, hors cible B2B, doublon).

Critères clés : solvabilité (score et limite de crédit Creditsafe vs montant demandé), santé financière (fonds propres, incidents de paiement), âge de la société (< 3 ans = risque accru → caution ou refus), encours existant vs limites fixées (dépassement de limite = refus ou condition stricte), cohérence équipement/activité/montant, qualité de l'apporteur.

Sois factuel et concis. "rationale" en français, 3 à 6 phrases, exploitable telle quelle par l'analyste humain. Ne recommande jamais A si une limite d'encours est dépassée ou si le montant excède nettement la limite de crédit conseillée.`;

async function callClaude(dossier: unknown): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: RECOMMENDATION_SCHEMA,
        },
      },
      messages: [
        {
          role: "user",
          content: `Analyse ce dossier de financement et rends ta recommandation structurée :\n\n${JSON.stringify(dossier, null, 2)}`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${t.slice(0, 500)}`);
  }
  const data = await resp.json();
  if (data.stop_reason === "refusal") {
    throw new Error("Analyse refusée par le modèle (stop_reason: refusal)");
  }
  const textPart = (data.content || []).find((c: any) => c.type === "text")?.text;
  if (!textPart) throw new Error("Réponse Claude vide");
  return JSON.parse(textPart);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin'],
      rateLimit: {
        endpoint: 'financing-decision-ai',
        maxRequests: 10,
        windowSeconds: 60,
        identifierPrefix: 'financing-decision-ai',
      },
    });
    if (!access.ok) return access.response;

    const supabase = access.context.supabaseAdmin;
    const { offerId } = await req.json();
    if (!offerId) return json({ success: false, error: 'offerId requis' }, 400);

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, company_id, client_id, client_name, amount, monthly_payment, coefficient, duration, remarks, financing_partner_id, created_at, workflow_status')
      .eq('id', offerId)
      .single();
    if (offerError || !offer) return json({ success: false, error: 'Offre introuvable' }, 404);

    if (
      !access.context.isServiceRole &&
      access.context.role !== 'super_admin' &&
      access.context.companyId !== offer.company_id
    ) {
      return json({ success: false, error: 'Cross-company access forbidden' }, 403);
    }

    // ── Rassembler le dossier ──
    const [{ data: equipment }, { data: client }, { data: partner }] = await Promise.all([
      supabase.from('offer_equipment').select('title, purchase_price, quantity').eq('offer_id', offerId),
      supabase.from('clients')
        .select('id, name, company, vat_number, country, business_sector, legal_form, company_creation_date, kyc_score, kyc_score_reasons, outstanding_limit')
        .eq('id', offer.client_id).maybeSingle(),
      offer.financing_partner_id
        ? supabase.from('financing_partners').select('id, name, partner_type, status, outstanding_limit, created_at').eq('id', offer.financing_partner_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Dernier rapport de crédit du client
    const { data: creditReport } = await supabase
      .from('credit_reports')
      .select('credit_score, credit_limit, rating_description, company_name, created_at')
      .eq('client_id', offer.client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Encours accepté (mêmes statuts que get_financing_exposure)
    const accepted = ['internal_approved', 'leaser_approved', 'approved', 'accepted', 'validated', 'financed', 'contract_signed', 'invoicing'];
    const [clientExp, partnerExp] = await Promise.all([
      supabase.from('offers').select('amount').eq('company_id', offer.company_id)
        .eq('client_id', offer.client_id).eq('type', 'financing_request').in('workflow_status', accepted),
      offer.financing_partner_id
        ? supabase.from('offers').select('amount').eq('company_id', offer.company_id)
            .eq('financing_partner_id', offer.financing_partner_id).eq('type', 'financing_request').in('workflow_status', accepted)
        : Promise.resolve({ data: [] }),
    ]);
    const sum = (rows: any[]) => (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);

    const dossier = {
      demande: {
        montant_finance: offer.amount,
        mensualite: offer.monthly_payment,
        duree_mois: offer.duration,
        coefficient: offer.coefficient,
        date_demande: offer.created_at,
        remarques_partenaire: offer.remarks || null,
        equipements: equipment || [],
      },
      client_final: client ? {
        societe: client.company || client.name,
        tva: client.vat_number,
        pays: client.country,
        forme_juridique: client.legal_form,
        secteur: client.business_sector,
        date_creation_societe: client.company_creation_date,
        score_kyc_interne: client.kyc_score,
        motifs_kyc: client.kyc_score_reasons,
        limite_encours: client.outstanding_limit,
        encours_actuel_accepte: sum(clientExp.data),
      } : null,
      rapport_credit: creditReport ? {
        score: creditReport.credit_score,
        description: creditReport.rating_description,
        limite_credit_conseillee: creditReport.credit_limit,
        date_rapport: creditReport.created_at,
      } : 'AUCUN RAPPORT DE CRÉDIT DISPONIBLE (signale-le comme point d\'attention)',
      apporteur: partner ? {
        nom: partner.name,
        type: partner.partner_type,
        statut: partner.status,
        anciennete: partner.created_at,
        limite_encours: partner.outstanding_limit,
        encours_actuel_accepte: sum(partnerExp.data),
      } : null,
    };

    const recommendation = await callClaude(dossier);

    const stored = {
      ...recommendation,
      model: ANTHROPIC_MODEL,
      generated_at: new Date().toISOString(),
      generated_by: access.context.userId || null,
    };

    const { error: updateError } = await supabase
      .from('offers')
      .update({ financing_ai_recommendation: stored })
      .eq('id', offerId);
    if (updateError) console.error('Erreur persistance recommandation:', updateError);

    return json({ success: true, recommendation: stored });
  } catch (error) {
    console.error('financing-decision-ai error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
};

Deno.serve(handler);
