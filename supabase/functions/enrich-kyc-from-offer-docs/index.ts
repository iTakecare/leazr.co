// Enrichit le KYC d'un client à partir des documents financiers déjà déposés
// sur ses offres (bilan, AER, bilan provisoire, autres financiers).
// On envoie plusieurs PDF en un seul appel Claude qui consolide les
// indicateurs (revenue, net_result, equity, employees, fiscal_year),
// stocke un nouveau client_kyc_reports source='offer_documents' et recalcule
// le score KYC.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const OFFER_DOCS_BUCKET = "offer-documents";
const MAX_DOCS_PER_CLIENT = 2; // bilan le plus récent + AER (cap pour respecter le rate limit Claude 30k tokens/min)
const THROTTLE_MS = 30000; // 30s entre clients pour rester sous 30k tokens/min sur des bilans (~12-15k tokens/req)
const MAX_CLIENTS_PER_RUN = 3; // edge function timeout 150s. 3 × 30s throttle + 3 × ~15s API = ~135s, marge sécurité

const FINANCIAL_DOC_TYPES = [
  "balance_sheet",
  "provisional_balance",
  "tax_notice",
  "additional:other_financial",
];

const DOC_TYPE_LABELS: Record<string, string> = {
  balance_sheet: "Bilan annuel",
  provisional_balance: "Bilan provisoire / situation intermédiaire",
  tax_notice: "AER (avertissement extrait de rôle, déclaration TVA/IPP)",
  "additional:other_financial": "Autre document financier",
};

const SYSTEM_PROMPT = `Tu es un assistant d'analyse KYC pour un courtier en leasing IT belge.

Tu reçois plusieurs documents financiers récents d'UNE MÊME entreprise (bilan annuel, AER, bilan provisoire, autres). Ton job : extraire les indicateurs consolidés les plus récents pour évaluer la santé financière.

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec un JSON valide, sans markdown ni texte autour.
- Si plusieurs exercices sont présents, prends le PLUS RÉCENT pour chaque indicateur.
- Si un indicateur n'apparaît dans aucun document, mets null (pas 0).
- Montants en EUR (number, pas de symbole).
- Sois conservateur : si tu hésites, mets confidence < 0.5.
- Détecte les warnings : "Fonds propres négatifs", "Perte importante", "Capitaux propres < capital minimum légal", "Cessation de paiements", etc.

SHAPE DE SORTIE :
{
  "financial_indicators": {
    "revenue": number | null,
    "net_result": number | null,
    "equity": number | null,
    "employees": number | null,
    "fiscal_year": number | null,
    "operating_result": number | null,
    "total_assets": number | null,
    "debt_ratio": number | null
  },
  "vat_situation": {
    "current_year_turnover_estimate": number | null,
    "vat_due": number | null,
    "vat_paid_on_time": boolean | null
  },
  "confidence": {
    "financial_indicators": number,
    "vat_situation": number
  },
  "warnings": string[],
  "summary": "Phrase courte résumant la situation financière."
}`;

interface FinancialDoc {
  id: string;
  document_type: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

interface ClientWithDocs {
  client_id: string;
  client_name: string;
  company_id: string;
  company_creation_date: string | null;
  current_score: string | null;
  docs: FinancialDoc[];
}

async function downloadAsBase64(supabase: any, filePath: string): Promise<{ base64: string; size: number } | null> {
  const { data, error } = await supabase.storage.from(OFFER_DOCS_BUCKET).download(filePath);
  if (error || !data) {
    console.warn(`[enrich-kyc] download failed for ${filePath}:`, error?.message);
    return null;
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return { base64: btoa(binary), size: bytes.length };
}

async function callClaudeMultiDoc(
  docs: Array<{ docType: string; fileName: string; base64: string }>,
): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");

  const userContent: any[] = [];
  for (const doc of docs) {
    userContent.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: doc.base64 },
    });
    userContent.push({
      type: "text",
      text: `↑ Ce document ci-dessus est : ${DOC_TYPE_LABELS[doc.docType] || doc.docType} (${doc.fileName})`,
    });
  }
  userContent.push({
    type: "text",
    text: "Analyse l'ensemble de ces documents et retourne le JSON consolidé.",
  });

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${errText.slice(0, 500)}`);
  }
  const data = await resp.json();
  const textPart = (data.content || []).find((c: any) => c.type === "text")?.text;
  if (!textPart) throw new Error("Réponse Claude vide");
  const cleaned = textPart.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned);
}

function computeScoreFromExtraction(
  creationDate: string | null,
  financialIndicators: any,
  warnings: string[],
): { letter: "A" | "B" | "C" | "D"; reasons: string[] } {
  const FAILURE_KEYWORDS = ["faillite", "liquidation", "radiation", "cessation", "dissolution", "insolva"];
  const dReasons: string[] = [];
  for (const w of warnings || []) {
    if (FAILURE_KEYWORDS.some((k) => (w || "").toLowerCase().includes(k))) dReasons.push(`Alerte : ${w}`);
  }
  const fin = financialIndicators || {};
  if (typeof fin.equity === "number" && fin.equity < 0) {
    dReasons.push(`Fonds propres négatifs (${fin.equity.toLocaleString("fr-BE")} €)`);
  }
  if (typeof fin.net_result === "number" && fin.net_result < -50000) {
    dReasons.push(`Perte nette importante (${fin.net_result.toLocaleString("fr-BE")} €)`);
  }
  if (dReasons.length > 0) return { letter: "D", reasons: dReasons };

  // C: jeune entreprise
  let ageMonths: number | null = null;
  if (creationDate) {
    const d = new Date(creationDate);
    if (!isNaN(d.getTime())) {
      ageMonths = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    }
  }
  const cReasons: string[] = [];
  if (ageMonths !== null && ageMonths < 12) {
    cReasons.push(`Société de ${ageMonths} mois (< 12 mois)`);
  }
  if (
    typeof fin.revenue === "number" &&
    fin.revenue < 50000 &&
    typeof fin.employees === "number" &&
    fin.employees <= 1
  ) {
    cReasons.push(`Activité limitée (CA ${fin.revenue.toLocaleString("fr-BE")} €, ${fin.employees} employé)`);
  }
  if (cReasons.length > 0) return { letter: "C", reasons: cReasons };

  // A: established + healthy
  const matureAndActive = ageMonths !== null && ageMonths >= 36;
  const positiveEquity = typeof fin.equity === "number" && fin.equity > 0;
  const profitable = fin.net_result == null || (typeof fin.net_result === "number" && fin.net_result >= 0);
  if (matureAndActive && positiveEquity && profitable) {
    const aReasons: string[] = [`Société établie (${ageMonths} mois)`];
    if (typeof fin.equity === "number") aReasons.push(`Fonds propres positifs (${fin.equity.toLocaleString("fr-BE")} €)`);
    if (typeof fin.net_result === "number") {
      aReasons.push(
        fin.net_result > 0
          ? `Résultat net positif (${fin.net_result.toLocaleString("fr-BE")} €)`
          : "Résultat net à l'équilibre",
      );
    }
    return { letter: "A", reasons: aReasons };
  }

  // B
  const bReasons: string[] = [];
  if (ageMonths !== null) {
    if (ageMonths < 36) bReasons.push(`Société de ${ageMonths} mois (entre 1 et 3 ans)`);
    else bReasons.push(`Société établie (${ageMonths} mois)`);
  }
  if (positiveEquity) bReasons.push(`Fonds propres positifs (${fin.equity.toLocaleString("fr-BE")} €)`);
  if (typeof fin.net_result === "number" && fin.net_result >= 0) {
    bReasons.push(`Résultat net positif (${fin.net_result.toLocaleString("fr-BE")} €)`);
  }
  if ((!warnings || warnings.length === 0) && (ageMonths === null || ageMonths >= 12)) {
    bReasons.push("Aucune alerte");
  }
  if (bReasons.length === 0) bReasons.push("Données financières partielles, pas d'élément critique");
  return { letter: "B", reasons: bReasons };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin", "broker"],
      rateLimit: {
        endpoint: "enrich-kyc-from-offer-docs",
        maxRequests: 10,
        windowSeconds: 60,
        identifierPrefix: "enrich-kyc-from-offer-docs",
      },
    });
    if (!access.ok) return access.response;

    const supabase = access.context.supabaseAdmin;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body OK
    }

    // 0. Skip les clients déjà enrichis depuis offre docs (sauf si forceClientId)
    const skipClientIds = new Set<string>();
    if (!body.clientId) {
      const { data: alreadyEnriched } = await supabase
        .from("client_kyc_reports")
        .select("client_id, ai_extraction")
        .eq("source", "pdf_other")
        .eq("status", "validated");
      for (const r of alreadyEnriched || []) {
        if ((r.ai_extraction as any)?._enriched_from_offer_docs) {
          skipClientIds.add(r.client_id);
        }
      }
    }

    // 1. Récupérer les docs financiers groupés par client. Priorité :
    //    balance_sheet > tax_notice > provisional_balance > additional:other_financial
    let docQuery = supabase
      .from("offer_documents")
      .select("id, offer_id, document_type, file_path, file_size, mime_type, status, uploaded_at")
      .in("document_type", FINANCIAL_DOC_TYPES)
      .in("status", ["approved", "pending"])
      .ilike("mime_type", "%pdf%")
      .order("uploaded_at", { ascending: false });

    const { data: allDocs, error: docsErr } = await docQuery;
    if (docsErr) throw new Error(`Lecture docs : ${docsErr.message}`);
    if (!allDocs || allDocs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0, processed: 0, succeeded: 0, failed: 0 }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const offerIds = [...new Set(allDocs.map((d: any) => d.offer_id))];
    const { data: offers } = await supabase
      .from("offers")
      .select("id, client_id")
      .in("id", offerIds);
    const offerToClient = new Map<string, string>();
    (offers || []).forEach((o: any) => offerToClient.set(o.id, o.client_id));

    // Group docs by client + dédup par type (garder le plus récent par type)
    const clientDocs = new Map<string, FinancialDoc[]>();
    const seenPerClient = new Map<string, Set<string>>(); // clientId → Set<docType>
    const PRIORITY: Record<string, number> = {
      balance_sheet: 1,
      tax_notice: 2,
      provisional_balance: 3,
      "additional:other_financial": 4,
    };
    // Sort allDocs by document_type priority then date desc
    const sortedDocs = [...(allDocs as any[])].sort((a, b) => {
      const pa = PRIORITY[a.document_type] ?? 99;
      const pb = PRIORITY[b.document_type] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    });
    for (const d of sortedDocs) {
      const cid = offerToClient.get(d.offer_id);
      if (!cid) continue;
      if (skipClientIds.has(cid)) continue;
      if (!seenPerClient.has(cid)) seenPerClient.set(cid, new Set());
      const seen = seenPerClient.get(cid)!;
      if (seen.has(d.document_type)) continue; // déjà ce type pour ce client
      seen.add(d.document_type);
      if (!clientDocs.has(cid)) clientDocs.set(cid, []);
      const list = clientDocs.get(cid)!;
      if (list.length < MAX_DOCS_PER_CLIENT) list.push(d);
    }

    const clientIds = body.clientId ? [body.clientId] : [...clientDocs.keys()];
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, company_id, company_creation_date, kyc_score")
      .in("id", clientIds);

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0, processed: 0, succeeded: 0, failed: 0 }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Restrict to user's company unless service_role / super_admin
    const eligibleClients = clients.filter((c: any) => {
      if (access.context.isServiceRole || access.context.role === "super_admin") return true;
      return c.company_id === access.context.companyId;
    });

    const candidates: ClientWithDocs[] = eligibleClients
      .map((c: any) => ({
        client_id: c.id,
        client_name: c.name,
        company_id: c.company_id,
        company_creation_date: c.company_creation_date,
        current_score: c.kyc_score,
        docs: (clientDocs.get(c.id) || []).slice(0, MAX_DOCS_PER_CLIENT),
      }))
      .filter((c) => c.docs.length > 0)
      .slice(0, MAX_CLIENTS_PER_RUN);

    const stats = {
      total: candidates.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      score_changes: [] as Array<{ name: string; from: string | null; to: string }>,
    };
    const failures: Array<{ clientId: string; reason: string }> = [];

    for (const cand of candidates) {
      stats.processed++;
      try {
        // Télécharger les docs
        const downloads: Array<{ docType: string; fileName: string; base64: string; size: number }> = [];
        for (const doc of cand.docs) {
          const dl = await downloadAsBase64(supabase, doc.file_path);
          if (dl) {
            downloads.push({
              docType: doc.document_type,
              fileName: doc.file_path.split("/").pop() || "doc.pdf",
              base64: dl.base64,
              size: dl.size,
            });
          }
        }
        if (downloads.length === 0) throw new Error("Aucun document n'a pu être téléchargé depuis Storage");

        // Appel Claude
        const extraction = await callClaudeMultiDoc(downloads);

        // Insert kyc_report
        const { error: insertErr } = await supabase.from("client_kyc_reports").insert({
          client_id: cand.client_id,
          company_id: cand.company_id,
          uploaded_by: access.context.userId,
          source: "pdf_other",
          status: "validated",
          ai_extraction: {
            ...extraction,
            _enriched_from_offer_docs: true,
            _doc_count: downloads.length,
            _doc_types: downloads.map((d) => d.docType),
          },
          applied_fields: { financial_indicators_only: true },
          analyzed_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          validated_by: access.context.userId,
        });
        if (insertErr) throw new Error(`Insert report : ${insertErr.message}`);

        // Recompute score basé sur creation_date + nouveaux indicateurs
        const score = computeScoreFromExtraction(
          cand.company_creation_date,
          extraction.financial_indicators,
          extraction.warnings || [],
        );
        const { error: updErr } = await supabase
          .from("clients")
          .update({
            kyc_score: score.letter,
            kyc_score_reasons: score.reasons,
            kyc_score_computed_at: new Date().toISOString(),
          })
          .eq("id", cand.client_id);
        if (updErr) throw new Error(`Update score : ${updErr.message}`);

        if (cand.current_score !== score.letter) {
          stats.score_changes.push({
            name: cand.client_name,
            from: cand.current_score,
            to: score.letter,
          });
        }
        stats.succeeded++;
      } catch (err) {
        stats.failed++;
        failures.push({
          clientId: cand.client_id,
          reason: (err as Error).message || String(err),
        });
        console.warn(`[enrich-kyc] échec pour ${cand.client_name}: ${(err as Error).message}`);
      }

      if (stats.processed < candidates.length) {
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...stats, failures: failures.slice(0, 20) }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    console.error("[enrich-kyc-from-offer-docs] erreur:", err);
    return new Response(
      JSON.stringify({ success: false, message: (err as Error).message || "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
