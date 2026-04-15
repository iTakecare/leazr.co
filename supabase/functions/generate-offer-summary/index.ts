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

    // ── 1. Fetch offer details ─────────────────────────────────────────────
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(
        "dossier_number, client_name, client_company, workflow_status, monthly_payment, amount, duration, internal_score, leaser_score, created_at, type, is_purchase"
      )
      .eq("id", offer_id)
      .single();

    if (offerError || !offer) {
      throw new Error(`Offer not found: ${offerError?.message}`);
    }

    // ── 2. Fetch equipment ─────────────────────────────────────────────────
    const { data: equipment } = await supabase
      .from("offer_equipment")
      .select("title, quantity, monthly_payment, purchase_price")
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
        .map(
          (e: any) =>
            `- ${e.title} (x${e.quantity}) — ${
              offer.is_purchase
                ? `prix: ${e.purchase_price?.toFixed(0) ?? "?"} €`
                : `mensualité: ${e.monthly_payment?.toFixed(0) ?? "?"} €/m`
            }`
        )
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

    const context = `
## Dossier de financement
- Numéro: ${offer.dossier_number ?? "N/A"}
- Client: ${offer.client_name}${offer.client_company ? ` (${offer.client_company})` : ""}
- Type: ${offer.is_purchase ? "Achat" : "Leasing"}
- Statut actuel: ${STATUS_LABELS[offer.workflow_status] ?? offer.workflow_status}
- Âge du dossier: ${offerAge} jours
- Montant: ${offer.amount?.toFixed(0) ?? "?"} €
- Mensualité: ${offer.monthly_payment?.toFixed(0) ?? "?"} €/mois
- Durée: ${offer.duration ?? "?"} mois
- Score ITC: ${offer.internal_score ?? "Non évalué"}
- Score leaser: ${offer.leaser_score ?? "Non évalué"}

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

    return new Response(JSON.stringify({ summary, offer_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-offer-summary error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
