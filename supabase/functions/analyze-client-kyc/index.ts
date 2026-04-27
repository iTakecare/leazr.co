import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const KYC_BUCKET = "client-kyc-reports";

const SYSTEM_PROMPT = `Tu es un assistant d'extraction de données KYC pour un courtier en leasing IT belge.

À partir d'un rapport société (Graydon, CompanyWeb, ou autre rapport d'entreprise), tu extrais les données structurées du JSON ci-dessous. Tu travailles indifféremment sur des sociétés (SRL, SA, SC, SCS...), des indépendants (personne physique enregistrée à la BCE), des ASBL ou autres entités.

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour, sans markdown, sans \`\`\`.
- Pour chaque champ, fournis aussi un score de confiance entre 0 et 1 dans le sous-objet \`confidence\`.
- Si un champ est absent du document, mets \`null\` (jamais une chaîne vide ou "N/A") et confidence à 0.
- Les dates au format ISO YYYY-MM-DD.
- Les montants en EUR sans symbole, en nombre (pas de chaîne).
- entity_type : "societe" pour toute personne morale commerciale (SRL, SA, SCS, SC...), "independant" pour une personne physique avec numéro d'entreprise, "asbl" pour une ASBL/AISBL, "autre" sinon.
- legal_form : la forme juridique brute du rapport ("SRL", "SA", "ASBL", "Personne physique", "Indépendant en personne physique"...).
- directors : array d'objets {name, role, since?: date}. Vide [] si N/A (indépendant en personne physique notamment).
- financial_indicators : objet avec revenue, net_result, equity, employees, fiscal_year — chaque sous-champ peut être null.

SHAPE DE SORTIE :
{
  "entity_type": "societe" | "independant" | "asbl" | "autre" | null,
  "legal_form": string | null,
  "company_name": string | null,
  "vat_number": string | null,
  "registration_date": "YYYY-MM-DD" | null,
  "address": string | null,
  "postal_code": string | null,
  "city": string | null,
  "country": string | null,
  "business_sector": string | null,
  "directors": [{"name": string, "role": string, "since": "YYYY-MM-DD" | null}],
  "financial_indicators": {
    "revenue": number | null,
    "net_result": number | null,
    "equity": number | null,
    "employees": number | null,
    "fiscal_year": number | null
  },
  "confidence": {
    "entity_type": number,
    "legal_form": number,
    "company_name": number,
    "vat_number": number,
    "registration_date": number,
    "address": number,
    "postal_code": number,
    "city": number,
    "country": number,
    "business_sector": number,
    "directors": number,
    "financial_indicators": number
  },
  "warnings": string[]
}

\`warnings\` : ajoute toute alerte importante (ex: "Société en liquidation", "Faillite déclarée le 2024-01-15", "Adresse radiée")."`;

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("pdf"),
    clientId: z.string().uuid(),
    filePath: z.string().min(1).max(500),
    source: z.enum(["graydon", "companyweb", "pdf_other"]),
  }),
  z.object({
    mode: z.literal("auto_lookup"),
    clientId: z.string().uuid(),
  }),
]);

type AnalyzeRequest = z.infer<typeof requestSchema>;

async function downloadPdfAsBase64(
  supabase: any,
  filePath: string,
): Promise<{ base64: string; size: number; mimeType: string } | { error: string }> {
  const { data, error } = await supabase.storage.from(KYC_BUCKET).download(filePath);
  if (error || !data) {
    return { error: error?.message || "Fichier introuvable dans le bucket" };
  }
  const arrayBuffer = await data.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Base64 encode in chunks (Deno's btoa chokes on very large strings).
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return {
    base64: btoa(binary),
    size: bytes.length,
    mimeType: data.type || "application/pdf",
  };
}

async function callClaudeOnPdf(pdfBase64: string, mimeType: string): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée");
  }

  // Claude n'accepte que application/pdf en type "document". Pour les images,
  // on bascule sur le content type "image".
  const isPdf = mimeType === "application/pdf";

  const userContent = isPdf
    ? [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
        },
        {
          type: "text",
          text: "Analyse ce rapport société et retourne le JSON structuré demandé dans le system prompt.",
        },
      ]
    : [
        {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: pdfBase64 },
        },
        {
          type: "text",
          text: "Analyse ce rapport société et retourne le JSON structuré demandé dans le system prompt.",
        },
      ];

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
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
  if (!textPart) {
    throw new Error("Réponse Claude vide ou inattendue");
  }
  // Parse JSON (defensive: strip optional code fences just in case)
  const cleaned = textPart.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON Claude invalide: ${(e as Error).message}. Début: ${cleaned.slice(0, 200)}`);
  }
}

function normalizeAutoLookupResponse(payload: any): any {
  // company-search peut retourner un tableau de matches. On prend le premier.
  const company = Array.isArray(payload?.results)
    ? payload.results[0]
    : Array.isArray(payload)
      ? payload[0]
      : payload?.company || payload;

  if (!company || typeof company !== "object") {
    return null;
  }

  const inferEntityType = (legalForm?: string | null): string | null => {
    if (!legalForm) return null;
    const lf = legalForm.toLowerCase();
    if (lf.includes("asbl") || lf.includes("aisbl") || lf.includes("non-profit")) return "asbl";
    if (lf.includes("indép") || lf.includes("indep") || lf.includes("personne physique") || lf.includes("self-employed") || lf.includes("entreprise individuelle")) return "independant";
    if (lf.match(/\b(sa|srl|sprl|scrl|sc|scs|sca|nv|bv|gmbh|sarl|sas|eurl)\b/)) return "societe";
    return "autre";
  };

  const legalForm = company.legal_form || company.legalForm || null;
  const entityType = inferEntityType(legalForm);

  return {
    entity_type: entityType,
    legal_form: legalForm,
    company_name: company.name || company.company_name || null,
    vat_number: company.vat_number || company.vatNumber || null,
    registration_date: company.creation_date || company.creationDate || null,
    address: company.address || null,
    postal_code: company.postal_code || company.postalCode || null,
    city: company.city || null,
    country: company.country || null,
    business_sector: company.sector || company.business_sector || null,
    directors: Array.isArray(company.directors) ? company.directors : [],
    financial_indicators: {
      revenue: company.revenue ?? null,
      net_result: company.net_result ?? null,
      equity: company.equity ?? null,
      employees: company.employees ?? null,
      fiscal_year: company.fiscal_year ?? null,
    },
    confidence: {
      entity_type: entityType ? 0.7 : 0,
      legal_form: legalForm ? 0.95 : 0,
      company_name: company.name ? 0.95 : 0,
      vat_number: company.vat_number ? 0.95 : 0,
      registration_date: company.creation_date ? 0.95 : 0,
      address: company.address ? 0.85 : 0,
      postal_code: company.postal_code ? 0.85 : 0,
      city: company.city ? 0.85 : 0,
      country: company.country ? 0.9 : 0,
      business_sector: company.sector ? 0.7 : 0,
      directors: Array.isArray(company.directors) && company.directors.length > 0 ? 0.8 : 0,
      financial_indicators: 0.5,
    },
    warnings: company.warnings || [],
    _source_raw: company,
  };
}

async function callCompanySearchInternal(
  vatNumber: string,
  country: string,
  authHeader: string,
): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL non configurée");
  }
  const resp = await fetch(`${supabaseUrl}/functions/v1/company-search`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: vatNumber,
      country: country || "BE",
      searchType: "vat",
      limit: 1,
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`company-search ${resp.status}: ${errText.slice(0, 300)}`);
  }
  return await resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin", "broker"],
      rateLimit: {
        endpoint: "analyze-client-kyc",
        maxRequests: 30,
        windowSeconds: 60,
        identifierPrefix: "analyze-client-kyc",
      },
    });
    if (!access.ok) {
      return access.response;
    }

    const supabase = access.context.supabaseAdmin;

    const rawBody = await req.text();
    let parsed: AnalyzeRequest;
    try {
      parsed = requestSchema.parse(JSON.parse(rawBody));
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, message: "Payload invalide", error: (err as Error).message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Charger le client + check company isolation
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, company_id, vat_number, country, name, company")
      .eq("id", parsed.clientId)
      .maybeSingle();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ success: false, message: "Client introuvable" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== client.company_id
    ) {
      return new Response(
        JSON.stringify({ success: false, message: "Cross-company access forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Crée la ligne pending
    const reportInsert: Record<string, any> = {
      client_id: client.id,
      company_id: client.company_id,
      uploaded_by: access.context.userId,
      source: parsed.mode === "pdf" ? parsed.source : "auto_lookup",
      status: "analyzing",
    };
    if (parsed.mode === "pdf") {
      reportInsert.file_path = parsed.filePath;
    }

    const { data: report, error: reportError } = await supabase
      .from("client_kyc_reports")
      .insert(reportInsert)
      .select("*")
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Impossible de créer le rapport KYC",
          error: reportError?.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    let extraction: any = null;
    let fileSize: number | null = null;
    let fileMime: string | null = null;
    let analysisError: string | null = null;

    try {
      if (parsed.mode === "pdf") {
        const downloaded = await downloadPdfAsBase64(supabase, parsed.filePath);
        if ("error" in downloaded) {
          throw new Error(`Téléchargement: ${downloaded.error}`);
        }
        fileSize = downloaded.size;
        fileMime = downloaded.mimeType;
        extraction = await callClaudeOnPdf(downloaded.base64, downloaded.mimeType);
      } else {
        if (!client.vat_number) {
          throw new Error(
            "Aucun numéro de TVA sur le client — impossible de faire un lookup automatique. Renseigne d'abord le VAT ou uploade un rapport.",
          );
        }
        const lookupResp = await callCompanySearchInternal(
          client.vat_number,
          client.country || "BE",
          req.headers.get("Authorization") || "",
        );
        extraction = normalizeAutoLookupResponse(lookupResp);
        if (!extraction) {
          throw new Error("Aucune donnée renvoyée par le lookup automatique");
        }
      }
    } catch (err) {
      analysisError = (err as Error).message || String(err);
    }

    if (analysisError) {
      await supabase
        .from("client_kyc_reports")
        .update({
          status: "failed",
          error_message: analysisError,
          analyzed_at: new Date().toISOString(),
          file_size: fileSize,
          file_mime_type: fileMime,
        })
        .eq("id", report.id);
      return new Response(
        JSON.stringify({ success: false, reportId: report.id, message: analysisError }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("client_kyc_reports")
      .update({
        status: "analyzed",
        ai_extraction: extraction,
        analyzed_at: new Date().toISOString(),
        file_size: fileSize,
        file_mime_type: fileMime,
      })
      .eq("id", report.id)
      .select("*")
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Échec mise à jour rapport",
          error: updateError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, report: updated }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    console.error("[analyze-client-kyc] erreur non gérée:", err);
    return new Response(
      JSON.stringify({ success: false, message: (err as Error).message || "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
