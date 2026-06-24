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

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function inferMimeFromPath(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return EXT_TO_MIME[ext] || null;
}

async function downloadPdfAsBase64(
  supabase: any,
  filePath: string,
): Promise<{ base64: string; size: number; mimeType: string } | { error: string }> {
  const { data, error } = await supabase.storage.from(KYC_BUCKET).download(filePath);
  if (error || !data) {
    return { error: error?.message || "Fichier introuvable dans le bucket" };
  }
  const arrayBuffer = await data.arrayBuffer();
  let bytes = new Uint8Array(arrayBuffer);

  // Source de vérité pour le mime = extension du fichier dans le path. data.type
  // (renvoyé par Supabase Storage) peut être "application/json" ou autre selon
  // ce qui était dans les métadonnées au moment de l'upload, ce qui ferait
  // basculer Claude sur "image" et rejeter le PDF.
  const inferredMime = inferMimeFromPath(filePath);
  const mimeType = inferredMime || data.type || "application/pdf";

  // Un PDF valide doit commencer par "%PDF". On cherche le marqueur dans les
  // 1024 premiers octets : certains exports (BOM, octets parasites en tête)
  // décalent le "%PDF" — Claude rejette alors le fichier ("PDF not valid").
  // Si on le trouve après le début, on retire le préambule. Sinon, le fichier
  // n'est pas un PDF (page web, JSON d'erreur, upload tronqué) → message + aperçu.
  if (mimeType === "application/pdf") {
    const head = String.fromCharCode(...bytes.subarray(0, Math.min(bytes.length, 1024)));
    const pdfIdx = head.indexOf("%PDF");
    if (pdfIdx === -1) {
      const previewAscii = String.fromCharCode(...bytes.subarray(0, 48)).replace(/[^\x20-\x7e]/g, ".");
      const previewHex = Array.from(bytes.subarray(0, 8)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      console.error(`[KYC] downloaded file is not a PDF — size=${bytes.length} hex=[${previewHex}] ascii="${previewAscii}"`);
      return {
        error:
          `Le fichier téléchargé n'est pas un PDF (taille ${bytes.length} octets, début « ${previewAscii} »). ` +
          `C'est peut-être une page web enregistrée, un JSON d'erreur ou un upload tronqué : ré-exportez le rapport en PDF et réessayez, ou utilisez le lookup automatique via le numéro de TVA.`,
      };
    }
    if (pdfIdx > 0) {
      console.warn(`[KYC] stripping ${pdfIdx} junk byte(s) before %PDF marker`);
      bytes = bytes.subarray(pdfIdx);
    }
  }

  // Base64 encode in chunks (Deno's btoa chokes on very large strings).
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  // Un PDF chiffré/protégé (cas fréquent des exports Graydon/CompanyWeb) est
  // rejeté par Claude avec "The PDF specified was not valid". On le détecte via
  // l'entrée /Encrypt et on explique comment le déprotéger.
  if (mimeType === "application/pdf" && binary.includes("/Encrypt")) {
    return {
      error:
        "Ce PDF est protégé (chiffré), l'analyse IA ne peut pas le lire. Ouvrez-le puis ré-enregistrez-le sans protection (Aperçu/Imprimer → « Enregistrer au format PDF »), et réuploadez-le. Vous pouvez aussi lancer le lookup automatique via le numéro de TVA.",
    };
  }

  return {
    base64: btoa(binary),
    size: bytes.length,
    mimeType,
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
    // PDF illisible par Claude (protégé, scan corrompu, format exotique) → message actionnable.
    if (resp.status === 400 && /not valid|could not (be )?process|unable to process|invalid.*pdf/i.test(errText)) {
      throw new Error(
        "Claude n'a pas pu lire ce PDF (PDF protégé, scan illisible ou format non standard). Ré-exportez le rapport en PDF standard (Imprimer → « Enregistrer au format PDF ») puis réessayez, ou utilisez le lookup automatique via le numéro de TVA.",
      );
    }
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

// =====================================================
// BCE direct scrape — pour avoir forme juridique, date début, NACE
// =====================================================

const BCE_LEGAL_FORM_TO_SHORT: Record<string, { short: string; entity: "societe" | "asbl" | "independant" | "autre" }> = {
  "société à responsabilité limitée": { short: "SRL", entity: "societe" },
  "besloten vennootschap": { short: "BV", entity: "societe" },
  "société privée à responsabilité limitée": { short: "SPRL", entity: "societe" },
  "société anonyme": { short: "SA", entity: "societe" },
  "naamloze vennootschap": { short: "NV", entity: "societe" },
  "société coopérative": { short: "SC", entity: "societe" },
  "société coopérative à responsabilité limitée": { short: "SCRL", entity: "societe" },
  "société en commandite simple": { short: "SCS", entity: "societe" },
  "société en nom collectif": { short: "SNC", entity: "societe" },
  "société en commandite par actions": { short: "SCA", entity: "societe" },
  "société européenne": { short: "SE", entity: "societe" },
  "groupement d'intérêt économique": { short: "GIE", entity: "societe" },
  "personne physique": { short: "PP", entity: "independant" },
  "indépendant en personne physique": { short: "PP", entity: "independant" },
  "association sans but lucratif": { short: "ASBL", entity: "asbl" },
  "vereniging zonder winstoogmerk": { short: "VZW", entity: "asbl" },
  "association internationale sans but lucratif": { short: "AISBL", entity: "asbl" },
  "fondation privée": { short: "FP", entity: "asbl" },
  "fondation d'utilité publique": { short: "FUP", entity: "asbl" },
};

function mapLegalFormBE(rawForm: string | null): { short: string | null; entity: "societe" | "asbl" | "independant" | "autre" } {
  if (!rawForm) return { short: null, entity: "autre" };
  const lc = rawForm.toLowerCase().trim();
  for (const [needle, mapping] of Object.entries(BCE_LEGAL_FORM_TO_SHORT)) {
    if (lc.includes(needle)) return mapping;
  }
  // Fallback: detect short codes already
  const upper = rawForm.toUpperCase();
  if (/\b(SRL|BV|SPRL|SA|NV|SC|SCS|SNC|SCRL|SCA|SE|GIE)\b/.test(upper)) return { short: upper.match(/\b(SRL|BV|SPRL|SA|NV|SC|SCS|SNC|SCRL|SCA|SE|GIE)\b/)![1], entity: "societe" };
  if (/\b(ASBL|AISBL|VZW|FP|FUP)\b/.test(upper)) return { short: upper.match(/\b(ASBL|AISBL|VZW|FP|FUP)\b/)![1], entity: "asbl" };
  if (/\bPP\b|PERSONNE PHYSIQUE|NATUURLIJK PERSOON/.test(upper)) return { short: "PP", entity: "independant" };
  return { short: rawForm, entity: "autre" };
}

function htmlDecode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBceDate(raw: string | null): string | null {
  if (!raw) return null;
  // BCE format: "10 janvier 2024" or "10/01/2024" or "2024-01-10"
  const cleaned = raw.trim();
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dmyMatch = cleaned.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  // Long form FR: "10 janvier 2024"
  const months: Record<string, string> = {
    janv: "01", janvier: "01", "janv.": "01",
    fevr: "02", "févr": "02", fev: "02", février: "02", fevrier: "02",
    mars: "03",
    avr: "04", avril: "04", "avr.": "04",
    mai: "05",
    juin: "06",
    juil: "07", juillet: "07", "juil.": "07",
    aout: "08", "août": "08",
    sept: "09", septembre: "09", "sept.": "09",
    oct: "10", octobre: "10", "oct.": "10",
    nov: "11", novembre: "11", "nov.": "11",
    dec: "12", "déc": "12", decembre: "12", "décembre": "12",
  };
  const longMatch = cleaned.toLowerCase().match(/(\d{1,2})\s+([a-zûéèà.]+)\s+(\d{4})/);
  if (longMatch) {
    const m = months[longMatch[2].replace(/\./g, "")] || months[longMatch[2]];
    if (m) return `${longMatch[3]}-${m}-${longMatch[1].padStart(2, "0")}`;
  }
  return null;
}

function extractFieldFromBceHtml(html: string, labelPatterns: RegExp[]): string | null {
  // BCE alternates row classes (QL = even, RL = odd). Format actuel observé sur kbopub.economie.fgov.be :
  // <td class="QL">Date de début:</td><td class="QL" colspan="3">22 octobre 2025<br/>...</td>
  // <td class="RL">Statut:</td><td class="RL" colspan="3"><strong>...Actif...</strong></td>
  for (const labelRegex of labelPatterns) {
    const rowRegex = new RegExp(
      `<td[^>]*class="(?:QL|RL)"[^>]*>\\s*${labelRegex.source}[^<:]*[:：]?[\\s\\S]*?</td>\\s*<td[^>]*class="(?:QL|RL)"[^>]*>([\\s\\S]*?)</td>`,
      "i",
    );
    const m = html.match(rowRegex);
    if (m && m[1]) {
      // Strip "<span class='upd'>Depuis le ...</span>" suffixes which are update dates, not the value
      const cleanedHtml = m[1].replace(/<span\s+class="upd"[\s\S]*?<\/span>/gi, "");
      const value = htmlDecode(cleanedHtml);
      if (value && value !== "-" && value !== "Pas de données reprises dans la BCE." && value.length > 0) {
        return value;
      }
    }
  }
  return null;
}

interface BceData {
  name: string | null;
  legal_form_raw: string | null;
  legal_form_short: string | null;
  entity_type: "societe" | "asbl" | "independant" | "autre" | null;
  start_date: string | null;
  status: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  nace_code: string | null;
  nace_label: string | null;
  warnings: string[];
}

// Valide un numéro d'entreprise belge (10 chiffres) via le checksum modulo 97 :
// les 2 derniers chiffres = 97 − (8 premiers mod 97). Évite d'interroger kbopub
// avec un numéro bidon (ex. un lead ID Meta collé par erreur dans le champ TVA).
function isValidBeEnterpriseNumber(vatNumber: string): boolean {
  const digits = vatNumber.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 10) return false;
  const full = digits.length === 9 ? `0${digits}` : digits;
  if (!/^[01]\d{9}$/.test(full)) return false; // n° d'entreprise commence par 0 ou 1
  const base = Number(full.slice(0, 8));
  const check = Number(full.slice(8));
  return 97 - (base % 97) === check;
}

async function fetchBceEnriched(vatNumber: string): Promise<BceData | null> {
  // Normalize VAT to digits-only
  const digits = vatNumber.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 10) return null;
  const enterpriseNumber = digits.length === 9 ? `0${digits}` : digits;

  // Page enterprise (full data) in French
  const url = `https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${enterpriseNumber}&lang=fr`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!resp.ok) {
    console.warn(`[BCE] fetch ${enterpriseNumber} → ${resp.status}`);
    return null;
  }
  const html = await resp.text();

  // Quick check: page exists and has data
  if (html.includes("Aucune donnée") || html.includes("not found") || html.length < 1000) {
    return null;
  }

  const name =
    extractFieldFromBceHtml(html, [/Dénomination\s*:?/i, /D[ée]nomination/i, /Naam/i]) ||
    null;

  const legalFormRaw = extractFieldFromBceHtml(html, [
    /Forme\s+l[ée]gale\s*:?/i,
    /Forme\s+juridique\s*:?/i,
    /Rechtsvorm/i,
  ]);
  // Fallback : "Type d'entité: Personne morale / Personne physique" → entity_type direct
  const entityKindRaw = extractFieldFromBceHtml(html, [
    /Type\s+d['']entit[ée]\s*:?/i,
    /Type\s+entiteit/i,
  ]);
  let { short: legalFormShort, entity: entityType } = mapLegalFormBE(legalFormRaw);
  if (!legalFormShort && entityKindRaw) {
    const kindLc = entityKindRaw.toLowerCase();
    if (kindLc.includes("personne physique") || kindLc.includes("natuurlijk persoon")) {
      entityType = "independant";
      legalFormShort = "PP";
    } else if (kindLc.includes("personne morale") || kindLc.includes("rechtspersoon")) {
      entityType = "societe";
    }
  }

  const startDateRaw = extractFieldFromBceHtml(html, [
    /Date\s+de\s+d[ée]but\s*:?/i,
    /Date\s+de\s+commencement\s*:?/i,
    /Begindatum/i,
    /Date\s+de\s+cr[ée]ation\s*:?/i,
  ]);
  const startDate = parseBceDate(startDateRaw);

  const status = extractFieldFromBceHtml(html, [/Statut\s*:?/i, /Status/i]);

  const addressFull = extractFieldFromBceHtml(html, [
    /Adresse\s+du\s+si[èe]ge\s*:?/i,
    /Si[èe]ge\s+social\s*:?/i,
    /Adres\s+van\s+de\s+zetel/i,
  ]);

  let address: string | null = null;
  let postalCode: string | null = null;
  let city: string | null = null;
  if (addressFull) {
    // Format BCE : "Avenue de Rome 3 Boîte 52 6030 Charleroi" — séparation greedy sur le CP 4 chiffres
    const addrMatch = addressFull.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
    if (addrMatch) {
      address = addrMatch[1].trim().replace(/[,\s]+$/, "");
      postalCode = addrMatch[2];
      city = addrMatch[3].trim();
    } else {
      address = addressFull;
    }
  }

  // NACE code : format kbopub actuel
  //   <a href="naceToelichting.html?nace.code=52260...">52.260</a>
  //     &nbsp;-&nbsp;
  //     Autres activités de soutien pour les transports<br/>
  let naceCode: string | null = null;
  let naceLabel: string | null = null;
  const naceMatch = html.match(
    /<a[^>]*href="naceToelichting[^"]*"[^>]*>(\d{2}\.\d{2,3})<\/a>\s*(?:&nbsp;[-–]&nbsp;)?\s*([^<\n]+?)(?:<br|<span|<\/td)/i,
  );
  if (naceMatch) {
    naceCode = naceMatch[1];
    naceLabel = htmlDecode(naceMatch[2]).slice(0, 200);
  }

  const warnings: string[] = [];
  if (status && /radi|cess|liquidation|faillite/i.test(status)) {
    warnings.push(`Statut BCE : ${status}`);
  }

  return {
    name,
    legal_form_raw: legalFormRaw,
    legal_form_short: legalFormShort,
    entity_type: entityType,
    start_date: startDate,
    status,
    address,
    postal_code: postalCode,
    city,
    nace_code: naceCode,
    nace_label: naceLabel,
    warnings,
  };
}

function bceDataToExtraction(bce: BceData, vatNumber: string): any {
  const businessSector = bce.nace_label
    ? `${bce.nace_code ? bce.nace_code + " — " : ""}${bce.nace_label}`
    : null;

  return {
    entity_type: bce.entity_type,
    legal_form: bce.legal_form_short || bce.legal_form_raw,
    company_name: bce.name,
    vat_number: vatNumber.startsWith("BE") ? vatNumber : `BE${vatNumber.replace(/\D/g, "")}`,
    registration_date: bce.start_date,
    address: bce.address,
    postal_code: bce.postal_code,
    city: bce.city,
    country: "BE",
    business_sector: businessSector,
    directors: [],
    financial_indicators: {
      revenue: null,
      net_result: null,
      equity: null,
      employees: null,
      fiscal_year: null,
    },
    confidence: {
      entity_type: bce.entity_type ? 0.95 : 0,
      legal_form: bce.legal_form_short ? 0.95 : (bce.legal_form_raw ? 0.85 : 0),
      company_name: bce.name ? 0.95 : 0,
      vat_number: 0.95,
      registration_date: bce.start_date ? 0.95 : 0,
      address: bce.address ? 0.9 : 0,
      postal_code: bce.postal_code ? 0.95 : 0,
      city: bce.city ? 0.95 : 0,
      country: 0.95,
      business_sector: businessSector ? 0.85 : 0,
      directors: 0,
      financial_indicators: 0,
    },
    warnings: bce.warnings,
    _source_raw: { source: "bce-direct", bce },
  };
}

// Calcul du score KYC (Option A simplifiée, identique à clientKycScore.ts côté front).
// Dupliquée ici pour rester côté serveur sans dépendance front.
function computeScoreFromExtraction(
  creationDate: string | null,
  financialIndicators: any,
  warnings: string[],
): { letter: "A" | "B" | "C" | "D"; reasons: string[] } {
  const FAILURE_KEYWORDS = ["faillite", "liquidation", "radiation", "cessation", "dissolution", "insolva"];
  const dReasons: string[] = [];
  for (const w of warnings || []) {
    if (FAILURE_KEYWORDS.some((k) => (w || "").toLowerCase().includes(k))) {
      dReasons.push(`Alerte : ${w}`);
    }
  }
  const fin = financialIndicators || {};
  if (typeof fin.equity === "number" && fin.equity < 0) {
    dReasons.push(`Fonds propres négatifs (${fin.equity.toLocaleString("fr-BE")} €)`);
  }
  if (typeof fin.net_result === "number" && fin.net_result < -50000) {
    dReasons.push(`Perte nette importante (${fin.net_result.toLocaleString("fr-BE")} €)`);
  }
  if (dReasons.length > 0) return { letter: "D", reasons: dReasons };

  let ageMonths: number | null = null;
  if (creationDate) {
    const d = new Date(creationDate);
    if (!isNaN(d.getTime())) {
      ageMonths = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    }
  }
  const cReasons: string[] = [];
  if (ageMonths !== null && ageMonths < 12) {
    cReasons.push(
      ageMonths === 0
        ? "Société créée il y a moins d'un mois"
        : `Société de ${ageMonths} mois (< 12 mois)`,
    );
  }
  if (
    typeof fin.revenue === "number" &&
    fin.revenue < 50000 &&
    typeof fin.employees === "number" &&
    fin.employees <= 1
  ) {
    cReasons.push(
      `Activité limitée (CA ${fin.revenue.toLocaleString("fr-BE")} €, ${fin.employees} employé)`,
    );
  }
  if (cReasons.length > 0) return { letter: "C", reasons: cReasons };

  const matureAndActive = ageMonths !== null && ageMonths >= 36;
  const positiveEquity = typeof fin.equity === "number" && fin.equity > 0;
  const profitable =
    fin.net_result == null || (typeof fin.net_result === "number" && fin.net_result >= 0);

  if (matureAndActive && positiveEquity && profitable) {
    const aReasons: string[] = [`Société établie (${ageMonths} mois)`];
    if (typeof fin.equity === "number") {
      aReasons.push(`Fonds propres positifs (${fin.equity.toLocaleString("fr-BE")} €)`);
    }
    if (typeof fin.net_result === "number") {
      aReasons.push(
        fin.net_result > 0
          ? `Résultat net positif (${fin.net_result.toLocaleString("fr-BE")} €)`
          : "Résultat net à l'équilibre",
      );
    }
    return { letter: "A", reasons: aReasons };
  }

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
  if (bReasons.length === 0) bReasons.push("Données partielles, pas d'élément critique");
  return { letter: "B", reasons: bReasons };
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
        // ⚠️ client.country est historiquement pollué (sert de "secteur d'activité"
        // sur beaucoup de fiches : "Coiffure", "Genie Civil"…). On déduit le pays
        // depuis le préfixe du VAT, qui est strict après passage par parseVatNumber.
        const vatPrefix = client.vat_number.substring(0, 2).toUpperCase();
        const country = ["BE", "FR", "LU", "NL", "DE", "ES"].includes(vatPrefix)
          ? vatPrefix
          : (client.country || "BE").toUpperCase();
        // Pour la Belgique : scrape direct kbopub (forme juridique, date de début, NACE, statut)
        // Pour FR/LU : on délègue à company-search qui sait router vers SIRENE / registre LU
        if (country === "BE") {
          if (!isValidBeEnterpriseNumber(client.vat_number)) {
            throw new Error(
              `« ${client.vat_number} » n'est pas un numéro d'entreprise belge valide (checksum incorrect). ` +
                "Vérifie le numéro de TVA / d'entreprise (format BE 0XXX.XXX.XXX) — il s'agit peut-être d'un identifiant de lead, pas d'une TVA.",
            );
          }
          const bce = await fetchBceEnriched(client.vat_number);
          if (!bce || (!bce.name && !bce.legal_form_raw && !bce.start_date)) {
            // Fallback : tenter l'ancien company-search au cas où le scrape kbopub a échoué
            const lookupResp = await callCompanySearchInternal(
              client.vat_number,
              country,
              req.headers.get("Authorization") || "",
            );
            extraction = normalizeAutoLookupResponse(lookupResp);
            if (!extraction) {
              throw new Error(
                "BCE n'a renvoyé aucune donnée pour ce numéro et le fallback company-search a échoué",
              );
            }
          } else {
            extraction = bceDataToExtraction(bce, client.vat_number);
          }
        } else {
          const lookupResp = await callCompanySearchInternal(
            client.vat_number,
            country,
            req.headers.get("Authorization") || "",
          );
          extraction = normalizeAutoLookupResponse(lookupResp);
          if (!extraction) {
            throw new Error("Aucune donnée renvoyée par le lookup automatique");
          }
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
      // 200 (pas 502) : un échec d'analyse est un résultat "métier" attendu, pas une
      // erreur HTTP. Avec un non-2xx, supabase-js écrase le message par un générique
      // « Edge Function returned a non-2xx status code ». En 200, le front lit
      // proprement data.message (cf. runAutoLookup → if (!data.success)).
      return new Response(
        JSON.stringify({ success: false, reportId: report.id, message: analysisError }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
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

    // Recompute du score AUTOMATIQUEMENT dès l'analyse, sans attendre que
    // l'admin clique "Appliquer & valider". Les indicateurs financiers et
    // les warnings extraits par Claude sont des données factuelles ; les
    // champs textuels (forme juridique, adresse) restent eux à valider
    // manuellement via la modale de diff.
    let newScore: { letter: string; reasons: string[] } | null = null;
    try {
      // Use the date from extraction OR existing client value
      const creationDate = extraction.registration_date || client.company_creation_date || null;
      newScore = computeScoreFromExtraction(
        creationDate,
        extraction.financial_indicators,
        Array.isArray(extraction.warnings) ? extraction.warnings : [],
      );
      await supabase
        .from("clients")
        .update({
          kyc_score: newScore.letter,
          kyc_score_reasons: newScore.reasons,
          kyc_score_computed_at: new Date().toISOString(),
        })
        .eq("id", client.id);
    } catch (err) {
      console.warn("[analyze-client-kyc] Score auto-recompute failed:", (err as Error).message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: updated,
        score: newScore,
      }),
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
