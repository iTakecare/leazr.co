// Cherche dans la BCE des candidats correspondant à un client (par nom de
// société, par nom du contact). Sert à enrichir les clients qui n'ont pas de
// VAT pour leur attribuer manuellement le bon VAT après validation humaine.
//
// La recherche `zoeknaamfonetischform` couvre les sociétés ET les indépendants
// en personne physique enregistrés à la BCE (ondNP=true). On ne peut pas
// chercher les dirigeants de sociétés sur BCE Public Search (= API payante).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CANDIDATES = 10;

const requestSchema = z.object({
  clientId: z.string().uuid(),
  /** Override: chercher avec une chaîne précise (sinon on déduit du client). */
  searchWord: z.string().trim().min(2).max(160).optional(),
});

interface BceCandidate {
  enterprise_number: string;
  vat_format: string;
  type: "ENT_PM" | "ENT_NP" | "OTHER";
  status: string | null;
  name: string;
  address: string | null;
  start_date_raw: string | null;
  source_query: string;
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

function htmlDecodeKeepBreaks(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ ]+/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

async function searchBce(searchWord: string): Promise<BceCandidate[]> {
  // Construire l'URL avec tous les params nécessaires (cf. form HTML zoeknaamfonetischform)
  const url = new URL("https://kbopub.economie.fgov.be/kbopub/zoeknaamfonetischform.html");
  url.searchParams.set("searchWord", searchWord);
  url.searchParams.set("_oudeBenaming", "on");
  url.searchParams.set("ondNP", "true");
  url.searchParams.set("_ondNP", "on");
  url.searchParams.set("ondRP", "true");
  url.searchParams.set("_ondRP", "on");
  url.searchParams.set("rechtsvormFonetic", "ALL");
  url.searchParams.set("vest", "true");
  url.searchParams.set("_vest", "on");
  url.searchParams.set("filterEnkelActieve", "true");
  url.searchParams.set("_filterEnkelActieve", "on");
  url.searchParams.set("actionNPRP", "Zoek");
  url.searchParams.set("lang", "fr");

  const resp = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "fr-BE,fr;q=0.9",
    },
  });
  if (!resp.ok) {
    console.warn(`[search-bce] HTTP ${resp.status} pour ${searchWord}`);
    return [];
  }
  const html = await resp.text();

  // On parse les <tr> du tableau des résultats. Format observé :
  //   <tr class="odd|even">
  //     <td>RANK</td>
  //     <td>ENT PM&nbsp; <br/> Actif </td>          ← type + statut
  //     <td><a href="toonondernemingps.html?ondernemingsnummer=NNN"> 0NNN.NNN.NNN</a><br/><span class="upd">date début</span></td>
  //     <td class="nowrap">unité d'établissement</td>
  //     <td class="benaming">NAME</td>
  //     <td>ADDRESS<br/>POSTAL CITY</td>
  //   </tr>
  const rowRegex = /<tr[^>]*class="(?:odd|even)"[^>]*>([\s\S]*?)<\/tr>/g;
  const candidates: BceCandidate[] = [];
  const seenNumbers = new Set<string>();

  for (const rowMatch of html.matchAll(rowRegex)) {
    const row = rowMatch[1];
    // Ne pas garder les lignes de "vestiging" (UE) — on veut l'entreprise, pas les implantations
    const numberMatch = row.match(/toonondernemingps\.html\?ondernemingsnummer=(\d+)/);
    if (!numberMatch) continue;
    const enterpriseNumber = numberMatch[1].padStart(10, "0");
    if (seenNumbers.has(enterpriseNumber)) continue;
    seenNumbers.add(enterpriseNumber);

    // Skip les rows qui sont des UE (Unité d'établissement) — elles partagent le n° d'entreprise
    // mais ont aussi un vestigingsnummer dans la 1re colonne contenant "UE"
    // Le 2e <td> indique "ENT PM/NP" ou "UE"
    const tdMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (tdMatches.length < 5) continue;

    const typeRaw = htmlDecode(tdMatches[1]).toUpperCase();
    if (typeRaw.includes("UE") && !typeRaw.includes("ENT")) continue;

    let type: BceCandidate["type"] = "OTHER";
    let status: string | null = null;
    if (typeRaw.includes("ENT PM")) type = "ENT_PM";
    else if (typeRaw.includes("ENT NP")) type = "ENT_NP";
    if (typeRaw.includes("ACTIF")) status = "Actif";
    else if (typeRaw.includes("INACTIF") || typeRaw.includes("RADI") || typeRaw.includes("CESS"))
      status = typeRaw.replace("ENT PM", "").replace("ENT NP", "").trim();

    // Date de début (3e <td> contient le n° + un span class="upd" avec la date)
    const dateMatch = tdMatches[2].match(/<span\s+class="upd"[^>]*>([\s\S]*?)<\/span>/);
    const startDateRaw = dateMatch ? htmlDecode(dateMatch[1]) : null;

    const name = htmlDecode(tdMatches[4]) || "(sans nom)";
    const address = htmlDecodeKeepBreaks(tdMatches[5]) || null;

    candidates.push({
      enterprise_number: enterpriseNumber,
      vat_format: `BE${enterpriseNumber}`,
      type,
      status,
      name,
      address: address ? address.replace(/\n/g, " · ") : null,
      start_date_raw: startDateRaw,
      source_query: searchWord,
    });

    if (candidates.length >= MAX_CANDIDATES) break;
  }

  return candidates;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin", "broker"],
      rateLimit: {
        endpoint: "search-bce-candidates",
        maxRequests: 60,
        windowSeconds: 60,
        identifierPrefix: "search-bce-candidates",
      },
    });
    if (!access.ok) return access.response;

    const supabase = access.context.supabaseAdmin;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Body JSON invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payload invalide",
          error: parsed.error.message,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, company_id, company, name, first_name, last_name, country")
      .eq("id", parsed.data.clientId)
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
        JSON.stringify({ success: false, message: "Accès cross-company refusé" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if ((client.country || "BE").toUpperCase() !== "BE") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Recherche BCE disponible uniquement pour les clients BE",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Construire la liste des requêtes à lancer
    const queries: string[] = [];
    if (parsed.data.searchWord) {
      queries.push(parsed.data.searchWord.trim());
    } else {
      if (client.company?.trim()) queries.push(client.company.trim());
      const personName = [client.first_name, client.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (personName && personName.length > 2 && !queries.includes(personName)) {
        queries.push(personName);
      }
      // Fallback : client.name si différent
      if (
        client.name?.trim() &&
        !queries.includes(client.name.trim()) &&
        client.name.trim() !== personName
      ) {
        queries.push(client.name.trim());
      }
    }

    if (queries.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Aucune chaîne de recherche : ce client n'a ni société, ni nom, ni prénom.",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Lancer les requêtes en série (throttle léger pour éviter de hammer kbopub)
    const allCandidates: BceCandidate[] = [];
    const seenNumbers = new Set<string>();
    for (const q of queries) {
      const found = await searchBce(q);
      for (const c of found) {
        if (!seenNumbers.has(c.enterprise_number)) {
          seenNumbers.add(c.enterprise_number);
          allCandidates.push(c);
        }
      }
      if (queries.indexOf(q) < queries.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
      if (allCandidates.length >= MAX_CANDIDATES) break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          first_name: client.first_name,
          last_name: client.last_name,
          company: client.company,
        },
        queries,
        candidates: allCandidates.slice(0, MAX_CANDIDATES),
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    console.error("[search-bce-candidates] erreur:", err);
    return new Response(
      JSON.stringify({ success: false, message: (err as Error).message || "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
