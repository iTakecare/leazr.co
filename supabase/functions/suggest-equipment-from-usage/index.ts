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

// Plafond du nombre de produits envoyés à Claude pour maîtriser les tokens.
// Au-delà, on tronque et on prévient le client (warning) — V1 mono-appel.
const CATALOG_CAP = 300;

const SYSTEM_PROMPT = `Tu es un expert en équipement informatique professionnel (B2B) pour un courtier en leasing IT.

À partir d'une description de l'USAGE que fera le client de son matériel, tu recommandes l'équipement le plus adapté EN CHOISISSANT EXCLUSIVEMENT parmi le catalogue fourni dans le message utilisateur.

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour, sans markdown, sans \`\`\`.
- Tu ne peux proposer QUE des produits présents dans le catalogue fourni, identifiés par leur "id" exact. N'invente jamais d'id ni de produit.
- Pour chaque produit recommandé, fournis une quantité entière >= 1 cohérente avec le besoin (ex: 1 poste par utilisateur). Ces quantités sont une suggestion : le commercial pourra les ajuster.
- Si le client a plusieurs profils/postes différents, propose plusieurs lignes.
- Pense aux accessoires pertinents présents dans le catalogue (écran, station d'accueil, clavier/souris, sacoche...) seulement s'ils existent dans le catalogue et sont utiles à l'usage décrit.
- Si le budget mensuel indicatif est fourni, essaie de rester dans cet ordre de grandeur (somme des monthly_price × quantités), sans sacrifier l'adéquation à l'usage. Si c'est impossible, propose quand même le matériel adapté et explique-le dans le rationale.
- "reason" : une phrase courte (français) expliquant pourquoi ce produit convient à l'usage.
- Si AUCUN produit du catalogue ne convient, renvoie "suggestions": [] et explique dans "rationale".

SHAPE DE SORTIE EXACTE :
{
  "suggestions": [
    { "product_id": "<id du catalogue>", "quantity": <entier >= 1>, "reason": "<phrase courte>" }
  ],
  "rationale": "<2-4 phrases résumant la logique globale de la configuration proposée>"
}`;

const requestSchema = z.object({
  // Description structurée de l'usage (tous les champs sont optionnels sauf au moins l'un d'eux)
  usage: z.object({
    profile: z.string().max(300).optional(),
    seats: z.number().int().min(1).max(10000).optional(),
    software: z.string().max(1000).optional(),
    mobility: z.enum(["sedentary", "nomadic", "hybrid"]).optional(),
    needs: z.array(z.string().max(120)).max(40).optional(),
    monthlyBudget: z.number().min(0).max(1_000_000).optional(),
    description: z.string().max(4000).optional(),
  }),
  // Optionnel : permet à un super_admin / service role de cibler une société.
  companyId: z.string().uuid().optional(),
});

type SuggestRequest = z.infer<typeof requestSchema>;

interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  short_description: string | null;
  specs: string | null;
  price: number;
  monthly_price: number;
}

const MOBILITY_LABEL: Record<string, string> = {
  sedentary: "sédentaire (poste fixe)",
  nomadic: "nomade (déplacements fréquents)",
  hybrid: "hybride (bureau + télétravail)",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Réduit les specifications (objet potentiellement volumineux) à une chaîne compacte.
function summarizeSpecs(specifications: unknown): string | null {
  if (!specifications || typeof specifications !== "object") return null;
  const entries = Object.entries(specifications as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .slice(0, 12)
    .map(([k, v]) => `${k}: ${String(v)}`);
  if (entries.length === 0) return null;
  return entries.join("; ").slice(0, 400);
}

async function loadCatalog(
  supabase: any,
  companyId: string,
): Promise<{ products: CatalogProduct[]; truncated: boolean }> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      brand,
      price,
      monthly_price,
      short_description,
      specifications,
      brands(name),
      categories(name)
    `)
    .eq("active", true)
    .eq("admin_only", false)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Lecture catalogue: ${error.message}`);
  }

  const all = (data || []).map((p: any): CatalogProduct => ({
    id: p.id,
    name: p.name,
    brand: p.brands?.name || p.brand || "",
    category: p.categories?.name || "",
    short_description: p.short_description || null,
    specs: summarizeSpecs(p.specifications),
    price: Number(p.price) || 0,
    monthly_price: Number(p.monthly_price) || 0,
  }));

  const truncated = all.length > CATALOG_CAP;
  return { products: truncated ? all.slice(0, CATALOG_CAP) : all, truncated };
}

function buildUserMessage(usage: SuggestRequest["usage"], products: CatalogProduct[]): string {
  const usageLines: string[] = [];
  if (usage.profile) usageLines.push(`- Profil / métier : ${usage.profile}`);
  if (usage.seats) usageLines.push(`- Nombre de postes / utilisateurs : ${usage.seats}`);
  if (usage.software) usageLines.push(`- Logiciels / applications utilisés : ${usage.software}`);
  if (usage.mobility) usageLines.push(`- Mobilité : ${MOBILITY_LABEL[usage.mobility] || usage.mobility}`);
  if (usage.needs && usage.needs.length > 0) usageLines.push(`- Besoins spécifiques : ${usage.needs.join(", ")}`);
  if (usage.monthlyBudget) usageLines.push(`- Budget mensuel indicatif total : ${usage.monthlyBudget} €/mois`);
  if (usage.description) usageLines.push(`- Description libre : ${usage.description}`);

  // Catalogue compact : une ligne JSON par produit pour limiter les tokens.
  const catalogLines = products.map((p) =>
    JSON.stringify({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      desc: p.short_description || undefined,
      specs: p.specs || undefined,
      monthly_price: p.monthly_price,
    }),
  );

  return [
    "USAGE DU CLIENT :",
    usageLines.length > 0 ? usageLines.join("\n") : "(non précisé)",
    "",
    `CATALOGUE DISPONIBLE (${products.length} produits, choisis uniquement parmi ces "id") :`,
    catalogLines.join("\n"),
    "",
    "Recommande la configuration d'équipement adaptée au format JSON demandé.",
  ].join("\n");
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée");
  }

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
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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
  const cleaned = textPart
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON Claude invalide: ${(e as Error).message}. Début: ${cleaned.slice(0, 200)}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      // "client" inclus : l'espace client expose aussi l'assistant (panier → commande).
      // L'isolation reste garantie par context.companyId (catalogue de la société du client).
      allowedRoles: ["admin", "super_admin", "broker", "ambassador", "client"],
      rateLimit: {
        endpoint: "suggest-equipment-from-usage",
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: "suggest-equipment",
      },
    });
    if (!access.ok) {
      return access.response;
    }

    const supabase = access.context.supabaseAdmin;

    const rawBody = await req.text();
    let parsed: SuggestRequest;
    try {
      parsed = requestSchema.parse(JSON.parse(rawBody));
    } catch (err) {
      return jsonResponse(
        { success: false, message: "Payload invalide", error: (err as Error).message },
        400,
      );
    }

    // Détermination de la société cible + isolation multi-tenant.
    const isSuper = access.context.isServiceRole || access.context.role === "super_admin";
    const companyId = parsed.companyId || access.context.companyId;
    if (!companyId) {
      return jsonResponse(
        { success: false, message: "company_id introuvable (aucune société associée au compte)" },
        400,
      );
    }
    if (!isSuper && access.context.companyId && companyId !== access.context.companyId) {
      return jsonResponse(
        { success: false, message: "Accès inter-société interdit" },
        403,
      );
    }

    // Au moins un champ d'usage renseigné.
    const u = parsed.usage;
    const hasUsage =
      !!u.profile || !!u.seats || !!u.software || !!u.mobility ||
      (u.needs && u.needs.length > 0) || !!u.monthlyBudget || !!u.description;
    if (!hasUsage) {
      return jsonResponse(
        { success: false, message: "Décris au moins un élément d'usage (profil, postes, logiciels, description...)" },
        400,
      );
    }

    const { products, truncated } = await loadCatalog(supabase, companyId);
    if (products.length === 0) {
      return jsonResponse(
        { success: false, message: "Aucun produit actif dans le catalogue de cette société." },
        422,
      );
    }

    const userMessage = buildUserMessage(parsed.usage, products);
    const aiResult = await callClaude(SYSTEM_PROMPT, userMessage);

    // Validation : ne garder que les product_id réellement présents dans le catalogue.
    const byId = new Map(products.map((p) => [p.id, p]));
    const rawSuggestions: any[] = Array.isArray(aiResult?.suggestions) ? aiResult.suggestions : [];

    const suggestions = rawSuggestions
      .map((s) => {
        const product = byId.get(String(s?.product_id));
        if (!product) return null;
        const quantity = Math.max(1, Math.floor(Number(s?.quantity) || 1));
        return {
          product_id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          image_url: null as string | null, // enrichi côté front si besoin
          price: product.price,
          monthly_price: product.monthly_price,
          quantity,
          reason: typeof s?.reason === "string" ? s.reason.slice(0, 300) : "",
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const warnings: string[] = [];
    if (truncated) {
      warnings.push(
        `Le catalogue dépasse ${CATALOG_CAP} produits : seuls les ${CATALOG_CAP} plus récents ont été analysés.`,
      );
    }
    const ignored = rawSuggestions.length - suggestions.length;
    if (ignored > 0) {
      warnings.push(`${ignored} suggestion(s) ignorée(s) car l'IA a renvoyé un produit hors catalogue.`);
    }

    return jsonResponse({
      success: true,
      suggestions,
      rationale: typeof aiResult?.rationale === "string" ? aiResult.rationale : "",
      catalogSize: products.length,
      warnings,
    });
  } catch (err) {
    console.error("[suggest-equipment-from-usage] erreur:", err);
    return jsonResponse(
      { success: false, message: (err as Error).message || "Erreur serveur" },
      500,
    );
  }
});
