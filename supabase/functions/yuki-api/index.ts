// yuki-api — pont LECTURE SEULE vers la comptabilité Yuki.
// Actions :
//   test       : authentifie (clé fournie ou stockée) + liste les administrations
//   balance    : soldes par compte GL à une date + synthèse PCMN (6/7/55/40/44)
//   netrevenue : CA net entre deux dates
// La clé est stockée dans company_integrations (integration_type='yuki').
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import {
  YukiCredentials,
  yukiAuthenticate,
  yukiAdministrations,
  yukiGLAccountBalance,
  yukiNetRevenue,
  summarizeBalance,
} from "../_shared/yuki.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Méthode non supportée" }, 405);

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: {
        endpoint: "yuki-api",
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: "yuki-api",
      },
    });
    if (!access.ok) return access.response;

    let payload: {
      companyId: string;
      action: string;
      accessKey?: string;
      administrationId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
    };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { companyId, action } = payload;
    if (!companyId || !action) return jsonResponse({ success: false, error: "companyId et action requis" }, 400);
    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== companyId
    ) {
      return jsonResponse({ success: false, error: "Cross-company access forbidden" }, 403);
    }

    const supabase = access.context.supabaseAdmin;

    // Credentials : fournis (test initial) ou stockés
    const getStoredCreds = async (): Promise<YukiCredentials | null> => {
      const { data } = await supabase
        .from("company_integrations")
        .select("api_credentials")
        .eq("company_id", companyId)
        .eq("integration_type", "yuki")
        .maybeSingle();
      return (data?.api_credentials as YukiCredentials) || null;
    };

    if (action === "test") {
      const accessKey = payload.accessKey || (await getStoredCreds())?.accessKey;
      if (!accessKey) return jsonResponse({ success: false, error: "Clé API Yuki manquante" }, 400);
      const sessionId = await yukiAuthenticate(accessKey);
      const administrations = await yukiAdministrations(sessionId);
      return jsonResponse({ success: true, administrations });
    }

    const creds = await getStoredCreds();
    if (!creds?.accessKey || !creds?.administrationId) {
      return jsonResponse({ success: false, error: "Intégration Yuki non configurée (clé + administration)" }, 400);
    }
    const sessionId = await yukiAuthenticate(creds.accessKey);

    if (action === "balance") {
      const date = payload.date || new Date().toISOString().slice(0, 10);
      const rows = await yukiGLAccountBalance(sessionId, creds.administrationId, date);
      return jsonResponse({ success: true, date, rows, summary: summarizeBalance(rows) });
    }

    if (action === "netrevenue") {
      const start = payload.startDate || `${new Date().getFullYear()}-01-01`;
      const end = payload.endDate || new Date().toISOString().slice(0, 10);
      const revenue = await yukiNetRevenue(sessionId, creds.administrationId, start, end);
      return jsonResponse({ success: true, start, end, revenue });
    }

    return jsonResponse({ success: false, error: `Action inconnue: ${action}` }, 400);
  } catch (error) {
    console.error("❌ yuki-api:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
