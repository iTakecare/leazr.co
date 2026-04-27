// Bulk KYC : enrichit en lot tous les clients qui ont un VAT (BE/FR/LU) mais
// pas encore de KYC validé. Throttle entre les requêtes pour ne pas hammer
// kbopub.economie.fgov.be / SIRENE.
//
// Sécurité :
//  - n'écrit JAMAIS sur les champs déjà remplis du client (no-overwrite)
//  - n'opère que sur les clients de la company de l'appelant
//  - admin/super_admin/broker uniquement
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const THROTTLE_MS = 1100; // 1 req/s un peu safe pour ne pas se faire blacklister par kbopub
const MAX_CLIENTS_PER_RUN = 100; // edge function timeout ≈ 150s → 100 × 1.1s = 110s (marge)

// ─────────────────────────────────────────────────────────────────────
// BCE scraper (copie minimale du scraper de analyze-client-kyc).
// On duplique pour éviter d'introduire un module partagé Deno fragile.
// ─────────────────────────────────────────────────────────────────────

const BCE_LEGAL_FORM_TO_SHORT: Record<string, { short: string; entity: string }> = {
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
  "personne physique": { short: "PP", entity: "independant" },
  "indépendant en personne physique": { short: "PP", entity: "independant" },
  "association sans but lucratif": { short: "ASBL", entity: "asbl" },
  "vereniging zonder winstoogmerk": { short: "VZW", entity: "asbl" },
  "association internationale sans but lucratif": { short: "AISBL", entity: "asbl" },
  "fondation privée": { short: "FP", entity: "asbl" },
  "fondation d'utilité publique": { short: "FUP", entity: "asbl" },
};

function mapLegalFormBE(rawForm: string | null): { short: string | null; entity: string } {
  if (!rawForm) return { short: null, entity: "autre" };
  const lc = rawForm.toLowerCase().trim();
  for (const [needle, mapping] of Object.entries(BCE_LEGAL_FORM_TO_SHORT)) {
    if (lc.includes(needle)) return mapping;
  }
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
  const cleaned = raw.trim();
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dmyMatch = cleaned.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
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

function extractField(html: string, labelPatterns: RegExp[]): string | null {
  for (const labelRegex of labelPatterns) {
    const rowRegex = new RegExp(
      `<td[^>]*class="(?:QL|RL)"[^>]*>\\s*${labelRegex.source}[^<:]*[:：]?[\\s\\S]*?</td>\\s*<td[^>]*class="(?:QL|RL)"[^>]*>([\\s\\S]*?)</td>`,
      "i",
    );
    const m = html.match(rowRegex);
    if (m && m[1]) {
      const cleanedHtml = m[1].replace(/<span\s+class="upd"[\s\S]*?<\/span>/gi, "");
      const value = htmlDecode(cleanedHtml);
      if (value && value !== "Pas de données reprises dans la BCE." && value !== "-" && value.length > 0) {
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
  entity_type: string;
  start_date: string | null;
  status: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  business_sector: string | null;
  warnings: string[];
}

async function scrapeBce(vatNumber: string): Promise<BceData | null> {
  const digits = vatNumber.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 10) return null;
  const enterpriseNumber = digits.length === 9 ? `0${digits}` : digits;
  const url = `https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${enterpriseNumber}&lang=fr`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8",
    },
  });
  if (!resp.ok) return null;
  const html = await resp.text();
  if (html.includes("Aucune donnée") || html.length < 1000) return null;

  const name = extractField(html, [/Dénomination/i, /D[ée]nomination/i]);
  const legalFormRaw = extractField(html, [/Forme\s+l[ée]gale/i, /Forme\s+juridique/i]);
  const entityKindRaw = extractField(html, [/Type\s+d['']entit[ée]/i]);
  let { short: legalFormShort, entity: entityType } = mapLegalFormBE(legalFormRaw);
  if (!legalFormShort && entityKindRaw) {
    const kindLc = entityKindRaw.toLowerCase();
    if (kindLc.includes("personne physique")) {
      entityType = "independant";
      legalFormShort = "PP";
    } else if (kindLc.includes("personne morale")) {
      entityType = "societe";
    }
  }

  const startDate = parseBceDate(extractField(html, [/Date\s+de\s+d[ée]but/i]));
  const status = extractField(html, [/Statut/i]);
  const addressFull = extractField(html, [/Adresse\s+du\s+si[èe]ge/i, /Si[èe]ge\s+social/i]);

  let address: string | null = null;
  let postalCode: string | null = null;
  let city: string | null = null;
  if (addressFull) {
    const m = addressFull.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
    if (m) {
      address = m[1].trim().replace(/[,\s]+$/, "");
      postalCode = m[2];
      city = m[3].trim();
    } else {
      address = addressFull;
    }
  }

  let businessSector: string | null = null;
  const naceMatch = html.match(
    /<a[^>]*href="naceToelichting[^"]*"[^>]*>(\d{2}\.\d{2,3})<\/a>\s*(?:&nbsp;[-–]&nbsp;)?\s*([^<\n]+?)(?:<br|<span|<\/td)/i,
  );
  if (naceMatch) {
    businessSector = `${naceMatch[1]} — ${htmlDecode(naceMatch[2]).slice(0, 200)}`;
  }

  const warnings: string[] = [];
  if (status && /radi|cess|liquidation|faillite|dissolution/i.test(status)) {
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
    business_sector: businessSector,
    warnings,
  };
}

// Score Option A simplifié : pas d'indicateurs financiers via lookup (BCE seul).
function computeScore(creationDate: string | null, warnings: string[]): {
  letter: "A" | "B" | "C" | "D";
  reasons: string[];
} {
  const failureKeywords = ["faillite", "liquidation", "radiation", "radié", "cessation", "cessé", "dissolution"];
  const hasRedFlag = warnings.some((w) => {
    const wLc = w.toLowerCase();
    return failureKeywords.some((k) => wLc.includes(k));
  });
  if (hasRedFlag) {
    return { letter: "D", reasons: warnings.slice() };
  }
  if (!creationDate) {
    return { letter: "B", reasons: ["Date de création inconnue", "Aucune alerte BCE"] };
  }
  const ageMonths = Math.floor(
    (Date.now() - new Date(creationDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );
  if (ageMonths < 12) {
    return { letter: "C", reasons: [`Société de ${ageMonths} mois (< 12 mois)`] };
  }
  if (ageMonths >= 36) {
    return {
      letter: "A",
      reasons: [`Société établie (${ageMonths} mois)`, "Aucune alerte BCE détectée"],
    };
  }
  return {
    letter: "B",
    reasons: [`Société de ${ageMonths} mois (entre 1 et 3 ans)`, "Aucune alerte BCE détectée"],
  };
}

// ─────────────────────────────────────────────────────────────────────
// HTTP handler
// ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin", "broker"],
      rateLimit: {
        endpoint: "bulk-kyc-lookup",
        maxRequests: 10,
        windowSeconds: 60,
        identifierPrefix: "bulk-kyc-lookup",
      },
    });
    if (!access.ok) return access.response;

    const supabase = access.context.supabaseAdmin;

    // Récupérer la liste des clients éligibles (avec VAT BE, sans KYC validé)
    let query = supabase
      .from("clients")
      .select("id, company_id, vat_number, country, name, company, entity_type, legal_form, company_creation_date, business_sector, address, postal_code, city")
      .not("vat_number", "is", null)
      .neq("vat_number", "")
      .is("kyc_validated_at", null)
      .limit(MAX_CLIENTS_PER_RUN);

    // Si pas service-role, restreindre à la company de l'appelant
    if (!access.context.isServiceRole && access.context.role !== "super_admin") {
      query = query.eq("company_id", access.context.companyId);
    }

    const { data: candidates, error: listError } = await query;
    if (listError) throw new Error(`Lecture clients : ${listError.message}`);
    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0, processed: 0, succeeded: 0, failed: 0, skipped: 0 }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const stats = { total: candidates.length, processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    const failures: Array<{ clientId: string; reason: string }> = [];

    for (const client of candidates) {
      stats.processed++;
      const country = (client.country || "BE").toUpperCase();
      // V1 : on traite que la BE (pour les autres pays, à venir)
      if (country !== "BE") {
        stats.skipped++;
        continue;
      }
      try {
        const bce = await scrapeBce(client.vat_number!);
        if (!bce || (!bce.name && !bce.legal_form_raw && !bce.start_date)) {
          stats.failed++;
          failures.push({ clientId: client.id, reason: "BCE n'a renvoyé aucune donnée" });
          continue;
        }

        // Extraction structurée stockée dans le report (pour audit)
        const extraction = {
          entity_type: bce.entity_type,
          legal_form: bce.legal_form_short || bce.legal_form_raw,
          company_name: bce.name,
          vat_number: client.vat_number,
          registration_date: bce.start_date,
          address: bce.address,
          postal_code: bce.postal_code,
          city: bce.city,
          country: "BE",
          business_sector: bce.business_sector,
          directors: [],
          financial_indicators: { revenue: null, net_result: null, equity: null, employees: null, fiscal_year: null },
          confidence: {
            entity_type: bce.entity_type ? 0.95 : 0,
            legal_form: bce.legal_form_short ? 0.95 : 0,
            company_name: bce.name ? 0.95 : 0,
            vat_number: 0.95,
            registration_date: bce.start_date ? 0.95 : 0,
            address: bce.address ? 0.9 : 0,
            postal_code: bce.postal_code ? 0.95 : 0,
            city: bce.city ? 0.95 : 0,
            country: 0.95,
            business_sector: bce.business_sector ? 0.85 : 0,
            directors: 0,
            financial_indicators: 0,
          },
          warnings: bce.warnings,
        };

        // Construire l'update du client : ne remplir QUE les champs vides.
        const updates: Record<string, any> = {};
        if (!client.entity_type && bce.entity_type) updates.entity_type = bce.entity_type;
        if (!client.legal_form && (bce.legal_form_short || bce.legal_form_raw)) {
          updates.legal_form = bce.legal_form_short || bce.legal_form_raw;
        }
        if (!client.company_creation_date && bce.start_date) updates.company_creation_date = bce.start_date;
        if (!client.business_sector && bce.business_sector) updates.business_sector = bce.business_sector;
        if (!client.address && bce.address) updates.address = bce.address;
        if (!client.postal_code && bce.postal_code) updates.postal_code = bce.postal_code;
        if (!client.city && bce.city) updates.city = bce.city;
        if (!client.company && bce.name) updates.company = bce.name;

        // Score
        const score = computeScore(bce.start_date, bce.warnings);
        updates.kyc_score = score.letter;
        updates.kyc_score_reasons = score.reasons;
        updates.kyc_score_computed_at = new Date().toISOString();
        updates.kyc_validated_at = new Date().toISOString();

        // Insert report (status='validated' car bulk auto)
        const { error: reportError } = await supabase.from("client_kyc_reports").insert({
          client_id: client.id,
          company_id: client.company_id,
          uploaded_by: access.context.userId,
          source: "auto_lookup",
          status: "validated",
          ai_extraction: extraction,
          applied_fields: updates,
          analyzed_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          validated_by: access.context.userId,
        });
        if (reportError) throw new Error(`Insert report : ${reportError.message}`);

        const { error: updateError } = await supabase.from("clients").update(updates).eq("id", client.id);
        if (updateError) throw new Error(`Update client : ${updateError.message}`);

        stats.succeeded++;
      } catch (err) {
        stats.failed++;
        failures.push({ clientId: client.id, reason: (err as Error).message || String(err) });
      }

      // Throttle
      if (stats.processed < candidates.length) {
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...stats, failures: failures.slice(0, 20) }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    console.error("[bulk-kyc-lookup] erreur:", err);
    return new Response(
      JSON.stringify({ success: false, message: (err as Error).message || "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
