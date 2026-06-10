// =====================================================================
// messaging-ai — assistant IA de la messagerie (pattern Capptain).
//
// Analyse le contenu des messages entrants (WhatsApp/SMS, et emails à la
// demande) avec Claude et produit des SUGGESTIONS structurées que l'admin
// valide dans l'inbox :
//   - link_offer        : lier la conversation à une demande (offre)
//   - identify_client   : nom/société détecté pour rattacher la fiche
//   - task              : créer une tâche dans la todolist
//   - classify_document : classer une pièce jointe dans le dossier
//   - reply             : brouillon de réponse pré-rempli
//
// Déclenchement :
//   - automatique : messaging-webhook appelle "analyze_conversation" en
//     server-to-server (Bearer = service_role key) après chaque inbound
//   - manuel : l'UI appelle "analyze_conversation" (re-analyse) ou
//     "analyze_email" (boîte mail) avec le JWT utilisateur
//   - "classify_document" : action d'exécution — copie le média du bucket
//     chat-media vers offer-documents + crée la ligne offer_documents
//     (côté serveur car le client n'écrit pas dans offer-documents).
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

const DOCUMENT_TYPES: Record<string, string> = {
  balance_sheet: "Bilan financier",
  tax_notice: "Avertissement extrait de rôle",
  id_card_front: "Carte d'identité - Recto",
  id_card_back: "Carte d'identité - Verso",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
  provisional_balance: "Bilan financier provisoire",
  tax_return: "Liasse fiscale",
  proof_of_address: "Justificatif de domicile",
  company_statutes: "Statuts de l'entreprise",
  custom: "Autre document",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Suggestion {
  kind: "link_offer" | "identify_client" | "task" | "classify_document" | "reply";
  payload: Record<string, unknown>;
  reason?: string;
}

async function callClaude(system: string, user: string): Promise<{ text: string; usage?: unknown }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const text = (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  console.log(`[messaging-ai] usage: ${JSON.stringify(data.usage)}`);
  return { text, usage: data.usage };
}

// Claude renvoie parfois le JSON entouré de ```json … ``` — on extrait.
function parseJsonLoose(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Pas de JSON dans la réponse IA");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const VALID_KINDS = new Set(["link_offer", "identify_client", "task", "classify_document", "reply"]);

// ---------------------------------------------------------------------
// analyze_conversation — contexte complet puis suggestions persistées
// ---------------------------------------------------------------------
async function analyzeConversation(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  conversationId: string,
): Promise<Response> {
  const { data: conv } = await adminSupabase
    .from("chat_conversations")
    .select("id, company_id, channel, client_id, client_phone, offer_id, visitor_name")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || conv.company_id !== companyId) {
    return jsonResponse({ success: false, error: "conversation_not_found" }, 404);
  }

  const { data: msgs } = await adminSupabase
    .from("chat_messages")
    .select("id, sender_type, sender_name, message, direction, media_path, media_content_type, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(15);
  const messages = (msgs ?? []).reverse();
  if (messages.length === 0) return jsonResponse({ success: true, suggestions: [] });

  let client: { id: string; name: string; email: string | null } | null = null;
  let offers: Array<{ id: string; offer_number: string | null; dossier_number: string | null; workflow_status: string | null; monthly_payment: number | null; created_at: string }> = [];
  let openTasks: Array<{ title: string }> = [];
  if (conv.client_id) {
    const { data: c } = await adminSupabase
      .from("clients").select("id, name, email").eq("id", conv.client_id).maybeSingle();
    client = c;
    const { data: o } = await adminSupabase
      .from("offers")
      .select("id, offer_number, dossier_number, workflow_status, monthly_payment, created_at")
      .eq("client_id", conv.client_id)
      .order("created_at", { ascending: false })
      .limit(10);
    offers = o ?? [];
    const { data: t } = await adminSupabase
      .from("tasks").select("title").eq("related_client_id", conv.client_id)
      .neq("status", "done").limit(8);
    openTasks = t ?? [];
  }

  const pendingMedia = messages.filter((m) => m.direction === "inbound" && m.media_path);
  const today = new Date().toISOString().slice(0, 10);

  const system = "Tu es l'assistant CRM de Leazr (leasing de matériel IT, B2B). Tu réponds uniquement par un objet JSON valide, sans texte autour.";
  const user = `Date du jour : ${today}.

Conversation ${conv.channel} avec ${client ? `le client "${client.name}" (fiche existante)` : `un numéro ${conv.client_phone} NON rattaché à une fiche client`}${conv.offer_id ? " — déjà liée à une demande" : ""}.

Derniers messages (inbound = le client, outbound = nous) :
${JSON.stringify(messages.map((m) => ({ id: m.id, direction: m.direction ?? "outbound", text: m.message, media: m.media_content_type ?? null, at: m.created_at })))}

${client ? `Demandes (offres) du client — id, numéro, statut workflow, mensualité :
${JSON.stringify(offers.map((o) => ({ id: o.id, numero: o.offer_number ?? o.dossier_number, statut: o.workflow_status, mensualite: o.monthly_payment, cree: o.created_at?.slice(0, 10) })))}

Tâches déjà ouvertes pour ce client : ${JSON.stringify(openTasks.map((t) => t.title))}` : ""}

${pendingMedia.length > 0 ? `Pièces jointes entrantes non classées (message_id, type MIME) :
${JSON.stringify(pendingMedia.map((m) => ({ message_id: m.id, mime: m.media_content_type })))}
Types de documents possibles : ${JSON.stringify(DOCUMENT_TYPES)}` : ""}

ÉTAPE 1 — Comprends ce que dit le client (question, envoi de document, demande de rappel, accord, refus, info de paiement, autre).
ÉTAPE 2 — Propose UNIQUEMENT les actions utiles parmi :
- "link_offer" {"offer_id":"...","offer_label":"<numéro>"} : si la conversation concerne clairement UNE des demandes listées et qu'elle n'est pas déjà liée. N'invente JAMAIS d'offer_id.
- "identify_client" {"suggested_name":"<nom ou société mentionné>"} : si la conversation n'est PAS rattachée à une fiche et que le client se présente.
- "task" {"title":"...","description":"...","due_in_days":N,"priority":"low"|"medium"|"high"} : si une action humaine est attendue (rappeler le client, vérifier un document, relancer). title court et actionnable, en français. Ne duplique pas une tâche déjà ouverte.
- "classify_document" {"message_id":"...","document_type":"<clé parmi les types>"} : une par pièce jointe entrante si son type est déductible du contexte (ex: le client dit "voici ma carte d'identité").
- "reply" {"body":"..."} : brouillon de réponse courte, chaleureuse et professionnelle en français (tutoiement interdit, signe "L'équipe iTakecare"). Seulement si une réponse est attendue. N'invente aucun chiffre ni délai précis.

Chaque suggestion a un "reason" (une courte phrase en français).
Si rien d'utile : liste vide.

Réponds UNIQUEMENT en JSON : {"summary":"<1 phrase>","suggestions":[{"kind":"...","payload":{...},"reason":"..."}]}`;

  const { text } = await callClaude(system, user);
  let parsed: { summary?: string; suggestions?: Suggestion[] };
  try {
    parsed = parseJsonLoose(text) as typeof parsed;
  } catch (e) {
    console.error("[messaging-ai] JSON parse failed:", text.slice(0, 400));
    return jsonResponse({ success: false, error: "ai_parse_error", message: String(e) }, 502);
  }

  const validOfferIds = new Set(offers.map((o) => o.id));
  const validMessageIds = new Set(pendingMedia.map((m) => m.id));
  const suggestions = (parsed.suggestions ?? []).filter((s) => {
    if (!s || !VALID_KINDS.has(s.kind)) return false;
    // Garde-fous anti-hallucination : les ids doivent venir du contexte fourni.
    if (s.kind === "link_offer") return !conv.offer_id && typeof s.payload?.offer_id === "string" && validOfferIds.has(s.payload.offer_id as string);
    if (s.kind === "classify_document") return typeof s.payload?.message_id === "string" && validMessageIds.has(s.payload.message_id as string) && typeof s.payload?.document_type === "string" && s.payload.document_type in DOCUMENT_TYPES;
    if (s.kind === "identify_client") return !conv.client_id && !!s.payload?.suggested_name;
    if (s.kind === "task") return !!s.payload?.title;
    if (s.kind === "reply") return !!s.payload?.body;
    return false;
  });

  // Remplace les suggestions pending précédentes (sinon elles s'empilent à
  // chaque message entrant). Les accepted/dismissed restent en historique.
  await adminSupabase
    .from("message_ai_suggestions")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("status", "pending");

  if (suggestions.length > 0) {
    const { error } = await adminSupabase.from("message_ai_suggestions").insert(
      suggestions.map((s) => ({
        company_id: companyId,
        conversation_id: conversationId,
        message_id: s.kind === "classify_document" ? (s.payload.message_id as string) : null,
        source: "chat",
        kind: s.kind,
        payload: s.payload,
        reason: s.reason ?? null,
      })),
    );
    if (error) console.error("[messaging-ai] insert suggestions failed:", error.message);
  }

  return jsonResponse({ success: true, summary: parsed.summary, suggestions });
}

// ---------------------------------------------------------------------
// analyze_email — centre d'actions IA pour la boîte mail (pattern Capptain).
// Renvoie des suggestions éphémères affichées dans une modale ; l'exécution
// se fait côté client / via mail-sync (attach_to_offer).
//   kinds : link_offer, task, reply, create_ticket, classify_document
// ---------------------------------------------------------------------
async function analyzeEmail(
  adminSupabase: Admin,
  companyId: string,
  emailId: string,
): Promise<Response> {
  const { data: email } = await adminSupabase
    .from("synced_emails")
    .select("id, company_id, from_address, from_name, subject, body_text, body_html, to_address, attachments, linked_offer_id")
    .eq("id", emailId)
    .maybeSingle();
  if (!email || email.company_id !== companyId) {
    return jsonResponse({ success: false, error: "email_not_found" }, 404);
  }

  // Match client par email expéditeur + ses demandes + ses tâches ouvertes.
  let client: { id: string; name: string } | null = null;
  let offers: Array<{ id: string; offer_number: string | null; dossier_number: string | null; workflow_status: string | null }> = [];
  let openTasks: Array<{ title: string }> = [];
  if (email.from_address) {
    const { data: c } = await adminSupabase
      .from("clients").select("id, name").eq("company_id", companyId)
      .ilike("email", email.from_address.trim()).maybeSingle();
    client = c;
    if (c) {
      const { data: o } = await adminSupabase
        .from("offers").select("id, offer_number, dossier_number, workflow_status")
        .eq("client_id", c.id).order("created_at", { ascending: false }).limit(10);
      offers = o ?? [];
      const { data: t } = await adminSupabase
        .from("tasks").select("title").eq("related_client_id", c.id).neq("status", "done").limit(8);
      openTasks = t ?? [];
    }
  }

  const attachments = (email.attachments ?? []) as Array<{ filename: string; content_type: string; index: number }>;
  const bodyText = (email.body_text ?? (email.body_html ? String(email.body_html).replace(/<[^>]+>/g, " ") : "")).slice(0, 4000);
  const today = new Date().toISOString().slice(0, 10);

  const system = "Tu es l'assistant CRM de Leazr (leasing de matériel IT, B2B). Tu réponds uniquement par un objet JSON valide, sans texte autour.";
  const user = `Date du jour : ${today}.

Email reçu de ${email.from_name ?? ""} <${email.from_address ?? "?"}>${client ? ` — client connu : "${client.name}"` : " — expéditeur INCONNU du CRM"}${email.linked_offer_id ? " (déjà lié à une demande)" : ""}.
Sujet : ${email.subject ?? "(sans objet)"}
Corps :
${bodyText}

${client ? `Demandes du client (id, numéro, statut) :
${JSON.stringify(offers.map((o) => ({ id: o.id, numero: o.offer_number ?? o.dossier_number, statut: o.workflow_status })))}
Tâches déjà ouvertes : ${JSON.stringify(openTasks.map((t) => t.title))}` : ""}

${attachments.length > 0 ? `Pièces jointes (index, nom, type) :
${JSON.stringify(attachments.map((a) => ({ index: a.index, nom: a.filename, type: a.content_type })))}
Types de documents possibles : ${JSON.stringify(DOCUMENT_TYPES)}` : ""}

Détermine d'abord la nature de l'email (demande client, envoi de document, question, rappel de paiement/facture, message administratif, newsletter/spam). Newsletter/notification automatique/spam → AUCUNE action.
Puis propose UNIQUEMENT les actions utiles parmi :
- "link_offer" {"offer_id":"...","offer_label":"<numéro>"} : si l'email concerne clairement une demande listée et n'y est pas déjà lié. N'invente JAMAIS d'offer_id.
- "task" {"title":"...","description":"...","due_in_days":N,"priority":"low"|"medium"|"high"} : si une action humaine est attendue. Rappel de paiement → title "Régler facture <réf> — <montant> € (échéance <date>)". Ne duplique pas une tâche ouverte.
- "create_ticket" {"title":"..."} : si l'email est une demande de support à tracer.
- "classify_document" {"attachment_index":N,"document_type":"<clé>","filename":"<nom>"} : une par pièce jointe pertinente, si son type est déductible.
- "reply" {"subject":"Re: ...","body":"..."} : brouillon de réponse en français (vouvoiement, signature "L'équipe iTakecare", aucun chiffre ni délai inventé) si une réponse est attendue.
Chaque suggestion a un "reason" (1 phrase).

Réponds UNIQUEMENT en JSON : {"summary":"<1 phrase>","matched_client":${client ? `{"id":"${client.id}","name":${JSON.stringify(client.name)}}` : "null"},"suggestions":[{"kind":"...","payload":{...},"reason":"..."}]}`;

  const { text } = await callClaude(system, user);
  let parsed: { summary?: string; matched_client?: unknown; suggestions?: Suggestion[] };
  try {
    parsed = parseJsonLoose(text) as typeof parsed;
  } catch (e) {
    return jsonResponse({ success: false, error: "ai_parse_error", message: String(e) }, 502);
  }

  const validOfferIds = new Set(offers.map((o) => o.id));
  const validAttachIdx = new Set(attachments.map((a) => a.index));
  const suggestions = (parsed.suggestions ?? []).filter((s) => {
    if (!s || !VALID_KINDS.has(s.kind) && s.kind !== "create_ticket") return false;
    if (s.kind === "link_offer") return !email.linked_offer_id && typeof s.payload?.offer_id === "string" && validOfferIds.has(s.payload.offer_id as string);
    if (s.kind === "classify_document") return validAttachIdx.has(Number(s.payload?.attachment_index)) && typeof s.payload?.document_type === "string" && (s.payload.document_type as string) in DOCUMENT_TYPES;
    if (s.kind === "task") return !!s.payload?.title;
    if (s.kind === "create_ticket") return !!s.payload?.title;
    if (s.kind === "reply") return !!s.payload?.body;
    return false;
  });

  return jsonResponse({ success: true, summary: parsed.summary, matched_client: parsed.matched_client ?? null, suggestions });
}

// ---------------------------------------------------------------------
// classify_document — exécution : copie chat-media → offer-documents
// ---------------------------------------------------------------------
async function classifyDocument(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string | null,
  payload: { message_id?: string; offer_id?: string; document_type?: string },
): Promise<Response> {
  const { message_id, offer_id, document_type } = payload;
  if (!message_id || !offer_id || !document_type) {
    return jsonResponse({ success: false, error: "missing_params", message: "message_id, offer_id et document_type sont requis" }, 400);
  }
  const { data: msg } = await adminSupabase
    .from("chat_messages")
    .select("id, media_path, media_content_type, conversation_id")
    .eq("id", message_id)
    .maybeSingle();
  if (!msg?.media_path) return jsonResponse({ success: false, error: "no_media" }, 404);
  // Le chemin chat-media commence par <company_id>/ — contrôle d'accès.
  if (!String(msg.media_path).startsWith(`${companyId}/`)) {
    return jsonResponse({ success: false, error: "forbidden" }, 403);
  }
  const { data: offer } = await adminSupabase
    .from("offers").select("id, company_id").eq("id", offer_id).maybeSingle();
  if (!offer || offer.company_id !== companyId) {
    return jsonResponse({ success: false, error: "offer_not_found" }, 404);
  }

  const { data: file, error: dlErr } = await adminSupabase.storage
    .from("chat-media").download(msg.media_path);
  if (dlErr || !file) return jsonResponse({ success: false, error: "download_failed", message: dlErr?.message }, 500);

  const ext = String(msg.media_path).split(".").pop() ?? "bin";
  const fileName = `${document_type}-whatsapp-${Date.now()}.${ext}`;
  const destPath = `${offer_id}/${fileName}`;
  const { error: upErr } = await adminSupabase.storage
    .from("offer-documents")
    .upload(destPath, file, { contentType: msg.media_content_type ?? "application/octet-stream", upsert: true });
  if (upErr) return jsonResponse({ success: false, error: "upload_failed", message: upErr.message }, 500);

  const { error: insErr } = await adminSupabase.from("offer_documents").insert({
    offer_id,
    document_type,
    file_name: fileName,
    file_path: destPath,
    mime_type: msg.media_content_type,
    status: "pending",
    uploaded_by: userId,
    admin_notes: "Reçu via la messagerie (WhatsApp/SMS), classé par l'assistant IA.",
  });
  if (insErr) return jsonResponse({ success: false, error: "insert_failed", message: insErr.message }, 500);

  return jsonResponse({ success: true, file_path: destPath, document_type });
}

// ---------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => null) as {
      action?: string;
      conversation_id?: string;
      company_id?: string;
      email_id?: string;
      payload?: Record<string, unknown>;
    } | null;
    if (!body?.action) return jsonResponse({ success: false, error: "invalid_action" }, 400);

    // Auth : soit interne (webhook → Bearer service_role), soit utilisateur.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    let companyId: string | null = null;
    let userId: string | null = null;

    if (token === serviceRoleKey) {
      companyId = body.company_id ?? null; // fourni par le webhook
    } else {
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error } = await userSupabase.auth.getUser(token);
      if (error || !claims?.user) return jsonResponse({ success: false, error: "unauthorized" }, 401);
      userId = claims.user.id;
      const { data: profile } = await userSupabase
        .from("profiles").select("company_id").eq("id", claims.user.id).single();
      companyId = profile?.company_id ?? null;
    }
    if (!companyId) return jsonResponse({ success: false, error: "no_company" }, 403);

    switch (body.action) {
      case "analyze_conversation":
        if (!body.conversation_id) return jsonResponse({ success: false, error: "conversation_id required" }, 400);
        return await analyzeConversation(adminSupabase, companyId, body.conversation_id);
      case "analyze_email":
        if (!body.email_id) return jsonResponse({ success: false, error: "email_id required" }, 400);
        return await analyzeEmail(adminSupabase, companyId, body.email_id);
      case "classify_document":
        return await classifyDocument(adminSupabase, companyId, userId, (body.payload ?? {}) as { message_id?: string; offer_id?: string; document_type?: string });
      default:
        return jsonResponse({ success: false, error: "unknown_action" }, 400);
    }
  } catch (e) {
    console.error("[messaging-ai] error:", e);
    return jsonResponse({ success: false, error: "internal_error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
