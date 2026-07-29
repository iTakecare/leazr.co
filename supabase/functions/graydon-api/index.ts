// @ts-nocheck
// graydon-api : proxy de scoring crédit Graydon-CreditSafe (Creditsafe Connect API)
// pour le module financeur (Winlease). Récupère le rapport de solvabilité d'une
// société (score, limite de crédit conseillée, rating) et le fige en credit_reports.
//
// Credentials par tenant : company_integrations (integration_type='graydon_creditsafe',
// api_credentials: {username, password}), sinon fallback env CREDITSAFE_USERNAME/PASSWORD.
//
// Actions :
//  - get_config    {companyId}            → { configured, source }
//  - fetch_report  {offerId} | {clientId} → { success, report } (+ insert credit_reports)
import { requireElevatedAccess } from "../_shared/security.ts";

const CREDITSAFE_BASE = Deno.env.get("CREDITSAFE_BASE_URL") || "https://connect.creditsafe.com/v1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

async function getCredentials(supabase: any, companyId: string): Promise<{ username: string; password: string; source: string } | null> {
  const { data } = await supabase
    .from('company_integrations')
    .select('api_credentials, is_enabled')
    .eq('company_id', companyId)
    .eq('integration_type', 'graydon_creditsafe')
    .maybeSingle();

  const creds = data?.is_enabled ? (data.api_credentials as any) : null;
  if (creds?.username && creds?.password) {
    return { username: creds.username, password: creds.password, source: 'company_integration' };
  }

  const envUser = Deno.env.get('CREDITSAFE_USERNAME');
  const envPass = Deno.env.get('CREDITSAFE_PASSWORD');
  if (envUser && envPass) {
    return { username: envUser, password: envPass, source: 'env' };
  }
  return null;
}

async function authenticate(username: string, password: string): Promise<string> {
  const resp = await fetch(`${CREDITSAFE_BASE}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Authentification Creditsafe échouée (${resp.status}): ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  if (!data?.token) throw new Error('Authentification Creditsafe: token absent');
  return data.token;
}

/** Cherche le connectId Creditsafe d'une société par n° TVA/BCE. */
async function searchCompany(token: string, vatNumber: string, country: string): Promise<any | null> {
  const cleaned = vatNumber.replace(/[^0-9A-Za-z]/g, '');
  const countries = country || 'BE';
  const attempts = [
    `${CREDITSAFE_BASE}/companies?countries=${countries}&vatNo=${encodeURIComponent(cleaned)}`,
    `${CREDITSAFE_BASE}/companies?countries=${countries}&regNo=${encodeURIComponent(cleaned.replace(/^(BE|FR|LU|NL|DE)/i, ''))}`,
  ];
  for (const url of attempts) {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) continue;
    const data = await resp.json();
    const companies = data?.companies || [];
    if (companies.length > 0) return companies[0];
  }
  return null;
}

async function getReport(token: string, connectId: string): Promise<any> {
  const resp = await fetch(`${CREDITSAFE_BASE}/companies/${encodeURIComponent(connectId)}?language=fr`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Rapport Creditsafe indisponible (${resp.status}): ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data?.report || data;
}

/** Extraction défensive des champs clés du rapport Creditsafe. */
function extractSummary(report: any) {
  const rating = report?.creditScore?.currentCreditRating || {};
  const previous = report?.creditScore?.previousCreditRating || {};
  const basic = report?.companySummary || report?.companyIdentification?.basicInformation || {};
  return {
    company_name:
      basic?.businessName || basic?.registeredCompanyName || report?.companyIdentification?.basicInformation?.registeredCompanyName || null,
    credit_score: rating?.commonValue || rating?.providerValue?.value?.toString?.() || null,
    credit_score_description: rating?.commonDescription || null,
    credit_limit: rating?.creditLimit?.value != null ? Number(rating.creditLimit.value) : null,
    credit_limit_currency: rating?.creditLimit?.currency || 'EUR',
    provider_score: rating?.providerValue?.value ?? null,
    provider_score_max: rating?.providerValue?.maxValue ?? null,
    previous_score: previous?.commonValue || null,
    status: basic?.companyStatus?.status || report?.companySummary?.companyStatus?.status || null,
    latest_annual_accounts: report?.financialStatements?.[0]?.yearEndDate || null,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin'],
      rateLimit: {
        endpoint: 'graydon-api',
        maxRequests: 30,
        windowSeconds: 60,
        identifierPrefix: 'graydon-api',
      },
    });
    if (!access.ok) return access.response;

    const supabase = access.context.supabaseAdmin;
    const body = await req.json();
    const action = body?.action;

    // Société de l'appelant (les admins d'un tenant n'agissent que sur leur tenant)
    const callerCompanyId = access.context.companyId;

    if (action === 'get_config') {
      const creds = await getCredentials(supabase, callerCompanyId);
      return json({ configured: !!creds, source: creds?.source || null });
    }

    if (action === 'fetch_report') {
      const { offerId, clientId } = body;

      // Résoudre le client (via l'offre ou directement)
      let client: any = null;
      let offer: any = null;
      if (offerId) {
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .select('id, company_id, client_id')
          .eq('id', offerId)
          .single();
        if (offerError || !offerData) return json({ success: false, error: 'Offre introuvable' }, 404);
        offer = offerData;
        if (!access.context.isServiceRole && access.context.role !== 'super_admin' && offer.company_id !== callerCompanyId) {
          return json({ success: false, error: 'Cross-company access forbidden' }, 403);
        }
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, company, vat_number, country, company_id')
          .eq('id', offer.client_id)
          .maybeSingle();
        client = clientData;
      } else if (clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, company, vat_number, country, company_id')
          .eq('id', clientId)
          .maybeSingle();
        client = clientData;
        if (client && !access.context.isServiceRole && access.context.role !== 'super_admin' && client.company_id !== callerCompanyId) {
          return json({ success: false, error: 'Cross-company access forbidden' }, 403);
        }
      }

      if (!client) return json({ success: false, error: 'Client introuvable' }, 404);
      if (!client.vat_number) {
        return json({ success: false, error: 'Le client n\'a pas de numéro de TVA/BCE — impossible d\'interroger Creditsafe' }, 400);
      }

      const creds = await getCredentials(supabase, client.company_id);
      if (!creds) {
        return json({
          success: false,
          not_configured: true,
          error: 'Intégration Graydon-CreditSafe non configurée (credentials manquants)',
        }, 200);
      }

      const token = await authenticate(creds.username, creds.password);
      const country = (client.country || 'BE').toUpperCase().slice(0, 2);
      const match = await searchCompany(token, client.vat_number, country);
      if (!match) {
        return json({ success: false, error: `Société introuvable chez Creditsafe (TVA ${client.vat_number}, pays ${country})` }, 200);
      }

      const report = await getReport(token, match.id);
      const summary = extractSummary(report);

      const { data: inserted, error: insertError } = await supabase
        .from('credit_reports')
        .insert({
          company_id: client.company_id,
          client_id: client.id,
          offer_id: offer?.id || null,
          provider: 'creditsafe',
          connect_id: match.id,
          company_name: summary.company_name || client.company || client.name,
          vat_number: client.vat_number,
          credit_score: summary.credit_score,
          credit_limit: summary.credit_limit,
          rating_description: summary.credit_score_description,
          payload: report,
          fetched_by: access.context.userId || null,
        })
        .select('id, created_at')
        .single();

      if (insertError) {
        console.error('Erreur insertion credit_reports:', insertError);
      }

      return json({
        success: true,
        report: {
          id: inserted?.id || null,
          fetched_at: inserted?.created_at || new Date().toISOString(),
          connect_id: match.id,
          ...summary,
        },
      });
    }

    return json({ success: false, error: `Action inconnue: ${action}` }, 400);
  } catch (error) {
    console.error('graydon-api error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
};

Deno.serve(handler);
