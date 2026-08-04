// @ts-nocheck
// oksign-api : adaptateur OKSign (signature électronique qualifiée via itsme)
// pour le module financeur (Winlease, Phase 3).
//
// ÉTAT : squelette prêt à brancher — la structure (auth, config par tenant,
// actions) est en place ; les appels réels seront activés dès réception des
// credentials OKSign (compte + clé API). D'ici là, les cérémonies utilisent le
// provider 'internal' (signature électronique maison).
//
// Credentials par tenant : company_integrations (integration_type='oksign',
// api_credentials: {api_key}), fallback env OKSIGN_API_KEY.
//
// Actions :
//  - get_config                       → { configured, source }
//  - create_request {ceremonyId}      → crée la demande de signature OKSign (itsme)
import { requireElevatedAccess } from "../_shared/security.ts";

const OKSIGN_BASE = Deno.env.get('OKSIGN_BASE_URL') || 'https://api.oksign.be/rest';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

async function getCredentials(supabase: any, companyId: string): Promise<{ apiKey: string; source: string } | null> {
  const { data } = await supabase
    .from('company_integrations')
    .select('api_credentials, is_enabled')
    .eq('company_id', companyId)
    .eq('integration_type', 'oksign')
    .maybeSingle();
  const creds = data?.is_enabled ? (data.api_credentials as any) : null;
  if (creds?.api_key) return { apiKey: creds.api_key, source: 'company_integration' };
  const envKey = Deno.env.get('OKSIGN_API_KEY');
  if (envKey) return { apiKey: envKey, source: 'env' };
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin'],
      rateLimit: {
        endpoint: 'oksign-api',
        maxRequests: 30,
        windowSeconds: 60,
        identifierPrefix: 'oksign-api',
      },
    });
    if (!access.ok) return access.response;

    const supabase = access.context.supabaseAdmin;
    const { action, ceremonyId } = await req.json();

    if (action === 'get_config') {
      const creds = await getCredentials(supabase, access.context.companyId);
      return json({ configured: !!creds, source: creds?.source || null, base_url: OKSIGN_BASE });
    }

    if (action === 'create_request') {
      const creds = await getCredentials(supabase, access.context.companyId);
      if (!creds) {
        return json({
          success: false,
          not_configured: true,
          error: "OKSign non configuré — la cérémonie reste en signature électronique interne. Renseignez la clé API OKSign (Paramètres → Intégrations) pour activer la signature qualifiée itsme.",
        });
      }

      const { data: ceremony } = await supabase
        .from('signature_ceremonies')
        .select('id, company_id, status')
        .eq('id', ceremonyId)
        .maybeSingle();
      if (!ceremony) return json({ success: false, error: 'Cérémonie introuvable' }, 404);
      if (ceremony.company_id !== access.context.companyId && access.context.role !== 'super_admin' && !access.context.isServiceRole) {
        return json({ success: false, error: 'Cross-company access forbidden' }, 403);
      }

      // TODO (activation OKSign) :
      //  1. Générer le PDF du document (generate-signed-contract-pdf sans signatures)
      //  2. POST document + signataires (itsme) sur l'API OKSign, ordre séquentiel
      //  3. signature_ceremonies.provider='oksign' + external_ref
      //  4. Webhook oksign → progression des signature_ceremony_signers
      return json({
        success: false,
        error: 'Création de demande OKSign pas encore activée (en attente du POC avec les credentials réels)',
      }, 501);
    }

    return json({ success: false, error: `Action inconnue: ${action}` }, 400);
  } catch (error) {
    console.error('oksign-api error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
};

Deno.serve(handler);
