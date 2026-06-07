import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Map status codes to French labels
const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé au client",
  internal_docs_requested: "Documents demandés (interne)",
  internal_approved: "Approuvé ITC",
  leaser_introduced: "Transmis au leaser",
  leaser_docs_requested: "Documents demandés (leaser)",
  leaser_approved: "Accordé par le leaser",
  financed: "Financé",
  accepted: "Accepté",
  rejected: "Rejeté",
  without_follow_up: "Sans suite",
};

const CALL_STATUS_LABELS: Record<string, string> = {
  reached: "Joint",
  voicemail: "Messagerie vocale",
  no_answer: "Pas de réponse",
  callback_scheduled: "Rappel planifié",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offer_id } = await req.json();
    if (!offer_id) {
      return new Response(JSON.stringify({ error: "offer_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY (multi-tenant): validate the offer through a client scoped to the
    // caller's JWT so RLS enforces tenant ownership. Without this, any
    // authenticated user could pass another company's offer_id and receive an
    // AI summary of that company's client/KYC/financials (data exfiltration).
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // ── 1. Fetch offer details (RLS-scoped to the caller's tenant) ──────────
    const { data: offer, error: offerError } = await callerClient
      .from("offers")
      .select(
        "dossier_number, client_name, client_id, workflow_status, monthly_payment, amount, duration, internal_score, leaser_score, created_at, type, is_purchase, rejection_category, previous_offer_id"
      )
      .eq("id", offer_id)
      .single();

    if (offerError || !offer) {
      throw new Error(`Offer not found: ${offerError?.message}`);
    }

    // Fetch client + KYC fields if client_id is available
    let clientCompany: string | null = null;
    let clientKyc: {
      entity_type: string | null;
      legal_form: string | null;
      company_creation_date: string | null;
      business_sector: string | null;
      kyc_validated_at: string | null;
      vat_number: string | null;
    } | null = null;
    let kycExtractionWarnings: string[] = [];
    let kycSource: string | null = null;
    let kycScore: { letter: string; reasons: string[] } | null = null;
    if (offer.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select(
          "company, entity_type, legal_form, company_creation_date, business_sector, kyc_validated_at, vat_number, kyc_score, kyc_score_reasons",
        )
        .eq("id", offer.client_id)
        .single();
      clientCompany = client?.company ?? null;
      if (client) {
        clientKyc = {
          entity_type: client.entity_type ?? null,
          legal_form: client.legal_form ?? null,
          company_creation_date: client.company_creation_date ?? null,
          business_sector: client.business_sector ?? null,
          kyc_validated_at: client.kyc_validated_at ?? null,
          vat_number: client.vat_number ?? null,
        };
        if (client.kyc_score) {
          kycScore = {
            letter: client.kyc_score,
            reasons: Array.isArray(client.kyc_score_reasons)
              ? (client.kyc_score_reasons as string[])
              : [],
          };
        }
      }

      // Récupérer le dernier rapport KYC validé pour ses warnings (radiation, faillite, ...)
      const { data: lastKycReport } = await supabase
        .from("client_kyc_reports")
        .select("source, ai_extraction, status, validated_at, analyzed_at")
        .eq("client_id", offer.client_id)
        .in("status", ["validated", "analyzed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastKycReport?.ai_extraction) {
        const ex = lastKycReport.ai_extraction as any;
        kycSource = lastKycReport.source ?? null;
        if (Array.isArray(ex.warnings)) {
          kycExtractionWarnings = ex.warnings.filter((w: any) => typeof w === "string");
        }
      }
    }

    // Calcul de l'âge de la société en mois (utile pour la décision)
    let companyAgeMonths: number | null = null;
    if (clientKyc?.company_creation_date) {
      const created = new Date(clientKyc.company_creation_date);
      if (!isNaN(created.getTime())) {
        const diffMs = Date.now() - created.getTime();
        companyAgeMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      }
    }

    // ── 2. Fetch equipment ─────────────────────────────────────────────────
    const { data: equipment } = await supabase
      .from("offer_equipment")
      .select("title, quantity, monthly_payment, purchase_price, is_gifted, base_purchase_price")
      .eq("offer_id", offer_id)
      .limit(10);

    // ── 3. Fetch recent call logs ──────────────────────────────────────────
    const { data: callLogs } = await supabase
      .from("offer_call_logs")
      .select("called_at, status, notes, callback_date")
      .eq("offer_id", offer_id)
      .order("called_at", { ascending: false })
      .limit(8);

    // ── 4. Fetch recent notes ──────────────────────────────────────────────
    const { data: notes } = await supabase
      .from("offer_notes")
      .select("content, created_at")
      .eq("offer_id", offer_id)
      .order("created_at", { ascending: false })
      .limit(6);

    // ── 5. Fetch workflow history ──────────────────────────────────────────
    const { data: history } = await supabase
      .from("offer_workflow_logs")
      .select("created_at, previous_status, new_status, reason")
      .eq("offer_id", offer_id)
      .order("created_at", { ascending: false })
      .limit(6);

    // ── 6. Build prompt context ────────────────────────────────────────────
    const offerAge = Math.floor(
      (Date.now() - new Date(offer.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const equipmentText =
      (equipment || [])
        .map((e: any) => {
          if (e.is_gifted) {
            const cost = (e.base_purchase_price ?? 0).toFixed(0);
            return `- ${e.title} (x${e.quantity}) — OFFERT (coût ${cost} € absorbé, gratuit pour le client)`;
          }
          return `- ${e.title} (x${e.quantity}) — ${
            offer.is_purchase
              ? `prix: ${e.purchase_price?.toFixed(0) ?? "?"} €`
              : `mensualité: ${e.monthly_payment?.toFixed(0) ?? "?"} €/m`
          }`;
        })
        .join("\n") || "Aucun équipement renseigné";

    const callLogsText =
      (callLogs || [])
        .map((c: any) => {
          const date = new Date(c.called_at).toLocaleDateString("fr-FR");
          const label = CALL_STATUS_LABELS[c.status] ?? c.status;
          const note = c.notes ? ` — "${c.notes}"` : "";
          const cb = c.callback_date
            ? ` (rappel: ${new Date(c.callback_date).toLocaleDateString("fr-FR")})`
            : "";
          return `[${date}] ${label}${cb}${note}`;
        })
        .join("\n") || "Aucun appel enregistré";

    const notesText =
      (notes || [])
        .map(
          (n: any) =>
            `[${new Date(n.created_at).toLocaleDateString("fr-FR")}] ${n.content}`
        )
        .join("\n") || "Aucune note";

    const historyText =
      (history || [])
        .map((h: any) => {
          const date = new Date(h.created_at).toLocaleDateString("fr-FR");
          const from = STATUS_LABELS[h.previous_status] ?? h.previous_status;
          const to = STATUS_LABELS[h.new_status] ?? h.new_status;
          const reason = h.reason ? ` — ${h.reason}` : "";
          return `[${date}] ${from} → ${to}${reason}`;
        })
        .join("\n") || "Aucun historique";

    const REJECTION_CATEGORY_LABELS: Record<string, string> = {
      fraud: "Suspicion de fraude",
      young_company: "Entreprise trop jeune / montant demandé",
      private_client: "Client particulier",
      financial_situation: "Situation financière insuffisante",
      other: "Autre",
    };

    // Bloc KYC : on ne l'inclut que si on a au moins un champ rempli
    const hasKyc = !!(
      clientKyc &&
      (clientKyc.entity_type ||
        clientKyc.legal_form ||
        clientKyc.company_creation_date ||
        clientKyc.business_sector ||
        clientKyc.kyc_validated_at)
    );

    const ENTITY_TYPE_LABELS: Record<string, string> = {
      societe: "Société (personne morale)",
      independant: "Indépendant en personne physique",
      asbl: "ASBL / AISBL",
      autre: "Autre",
    };

    const SCORE_LABELS: Record<string, string> = {
      A: "A — Risque très faible",
      B: "B — Risque modéré",
      C: "C — Vigilance requise",
      D: "D — Risque élevé",
    };

    const kycText = hasKyc
      ? `- Score KYC interne: ${
          kycScore ? SCORE_LABELS[kycScore.letter] ?? kycScore.letter : "Non calculé"
        }${
          kycScore && kycScore.reasons.length > 0
            ? `\n  Raisons du score: ${kycScore.reasons.join(" ; ")}`
            : ""
        }
- Type d'entité: ${
          clientKyc!.entity_type ? ENTITY_TYPE_LABELS[clientKyc!.entity_type] : "Non renseigné"
        }
- Forme juridique: ${clientKyc!.legal_form ?? "Non renseignée"}
- Date de création: ${
          clientKyc!.company_creation_date
            ? `${clientKyc!.company_creation_date}${
                companyAgeMonths !== null ? ` (société de ${companyAgeMonths} mois)` : ""
              }`
            : "Non renseignée"
        }
- Secteur d'activité: ${clientKyc!.business_sector ?? "Non renseigné"}
- TVA: ${clientKyc!.vat_number ?? "Non renseigné"}
- KYC validé le: ${clientKyc!.kyc_validated_at ?? "Jamais"}${
          kycSource ? ` (source: ${kycSource})` : ""
        }${
          kycExtractionWarnings.length > 0
            ? `\n- Alertes BCE/KYC: ${kycExtractionWarnings.join(" ; ")}`
            : ""
        }`
      : "Aucune analyse KYC réalisée pour ce client. Le secteur, la forme juridique et la date de création de l'entreprise ne sont pas connus.";

    const rejectionCategoryText = offer.rejection_category
      ? `- Catégorie de refus précédente: ${
          REJECTION_CATEGORY_LABELS[offer.rejection_category] ?? offer.rejection_category
        }`
      : "";

    const previousOfferText = offer.previous_offer_id
      ? `- Offre re-soumise après refus précédent: ${offer.previous_offer_id}`
      : "";

    const context = `
## Dossier de financement
- Numéro: ${offer.dossier_number ?? "N/A"}
- Client: ${offer.client_name}${clientCompany ? ` (${clientCompany})` : ""}
- Type: ${offer.is_purchase ? "Achat" : "Leasing"}
- Statut actuel: ${STATUS_LABELS[offer.workflow_status] ?? offer.workflow_status}
- Âge du dossier: ${offerAge} jours
- Montant: ${offer.amount?.toFixed(0) ?? "?"} €
- Mensualité: ${offer.monthly_payment?.toFixed(0) ?? "?"} €/mois
- Durée: ${offer.duration ?? "?"} mois
- Score ITC: ${offer.internal_score ?? "Non évalué"}
- Score leaser: ${offer.leaser_score ?? "Non évalué"}
${rejectionCategoryText}
${previousOfferText}

## Données société (KYC)
${kycText}

## Équipements
${equipmentText}

## Historique des appels (du plus récent au plus ancien)
${callLogsText}

## Notes récentes
${notesText}

## Historique du workflow
${historyText}
`.trim();

    // ── 7. Call OpenAI ─────────────────────────────────────────────────────
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const systemPrompt = `Tu es un assistant commercial expert en leasing et financement d'équipements professionnels.
Tu analyses des dossiers de financement et fournis un résumé structuré en JSON.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans code block, sans explication.`;

    const userPrompt = `Analyse ce dossier de financement et réponds avec un JSON ayant exactement ces clés:
{
  "situation": "Résumé de la situation actuelle en 2-3 phrases (ton: professionnel, factuel)",
  "risk_level": "faible" | "moyen" | "élevé",
  "risk_reason": "Explication courte du niveau de risque (1 phrase)",
  "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"] (max 4 points),
  "next_action": "Action concrète recommandée pour faire avancer le dossier (1 phrase)",
  "recommendation": "Recommandation stratégique globale (2-3 phrases)"
}

CONSIGNES IMPORTANTES :
- Si la section "Données société (KYC)" est remplie, utilise-la EN PRIORITÉ pour évaluer le risque (score KYC, forme juridique, âge de la société en mois, secteur d'activité, alertes BCE éventuelles).
- Le score KYC interne (A/B/C/D) est la synthèse calculée automatiquement à partir des données société. Aligne ton risk_level dessus :
  - Score A → risk_level "faible"
  - Score B → risk_level "faible" ou "moyen" selon le contexte (montant, secteur)
  - Score C → risk_level "moyen" ou "élevé"
  - Score D → risk_level "élevé"
- Reformule les "Raisons du score" dans risk_reason et key_points (ne les copie pas verbatim, intègre-les naturellement).
- Si la société a moins de 12 mois ET que la catégorie de refus précédente est "Entreprise trop jeune / montant demandé", recommande explicitement d'attendre le passage des 1 an pour relancer (la relance KYC enrichi via documents financiers reste possible avant cette échéance, mais sans bilan complet la décision du leaser ne changera probablement pas).
- Si des alertes BCE sont remontées (faillite, liquidation, radiation, situation anormale), force risk_level à "élevé" et mentionne-les dans risk_reason.
- Si le KYC n'est pas fait (section indique "Aucune analyse KYC réalisée"), inclus dans next_action une phrase suggérant de lancer le KYC depuis la fiche client pour fiabiliser la décision.
- Sois factuel : ne spécule pas sur des chiffres financiers absents (CA, fonds propres) si non fournis dans le KYC.

Voici les données du dossier:

${context}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices[0].message.content.trim();

    // Parse JSON — strip accidental markdown if present
    let summary;
    try {
      const cleaned = rawContent.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
      summary = JSON.parse(cleaned);
    } catch {
      throw new Error(`Could not parse OpenAI response as JSON: ${rawContent}`);
    }

    return new Response(
      JSON.stringify({
        summary,
        offer_id,
        kyc: {
          score: kycScore?.letter ?? null,
          score_reasons: kycScore?.reasons ?? [],
          entity_type: clientKyc?.entity_type ?? null,
          legal_form: clientKyc?.legal_form ?? null,
          company_creation_date: clientKyc?.company_creation_date ?? null,
          company_age_months: companyAgeMonths,
          business_sector: clientKyc?.business_sector ?? null,
          warnings: kycExtractionWarnings,
          validated_at: clientKyc?.kyc_validated_at ?? null,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("generate-offer-summary error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
