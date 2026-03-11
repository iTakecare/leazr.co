import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BillitCredentials {
  apiKey: string;
  baseUrl: string;
  companyId: string;
}

interface BillitInvoice {
  OrderID: number;
  OrderNumber: string;
  OrderDate: string;
  TotalExcl: number;
  TotalIncl: number;
  VATAmount: number;
  Paid: boolean;
  IsSent: boolean;
  OrderDirection: string;
  OrderType: string;
  CounterParty?: {
    DisplayName: string;
    VATNumber?: string;
    Email?: string;
  };
  OrderPDF?: {
    FileID: string;
  };
}

// Match score based on amount proximity
const calculateMatchScore = (invoiceAmount: number, equipmentTotal: number): number => {
  if (!equipmentTotal || equipmentTotal === 0) return 0;
  const diff = Math.abs(invoiceAmount - equipmentTotal);
  const percentDiff = (diff / invoiceAmount) * 100;
  if (percentDiff <= 1) return 100;
  if (percentDiff <= 3) return 80;
  if (percentDiff <= 5) return 60;
  if (percentDiff <= 10) return 40;
  return 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: {
        endpoint: "billit-import-purchase-invoices",
        maxRequests: 8,
        windowSeconds: 60,
        identifierPrefix: "billit-import-purchase-invoices",
      },
    });

    if (!access.ok) return access.response;

    let payload: { companyId: string };
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { companyId } = payload;
    console.log("📥 Début import factures d'ACHAT Billit - companyId:", companyId);

    if (!companyId) {
      return new Response(JSON.stringify({ success: false, error: "companyId is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== companyId
    ) {
      return new Response(JSON.stringify({ success: false, error: "Cross-company access forbidden" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    const supabase = access.context.supabaseAdmin;

    // Get Billit credentials
    const { data: integration, error: integrationError } = await supabase
      .from('company_integrations')
      .select('api_credentials, is_enabled')
      .eq('company_id', companyId)
      .eq('integration_type', 'billit')
      .single();

    if (integrationError || !integration?.is_enabled) {
      throw new Error("Intégration Billit non trouvée ou désactivée");
    }

    const credentials = integration.api_credentials as BillitCredentials;

    // Fix base URL
    let apiBaseUrl = credentials.baseUrl;
    if (apiBaseUrl.includes('my.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.billit.be', 'api.billit.be');
    }
    if (apiBaseUrl.includes('my.sandbox.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.sandbox.billit.be', 'api.sandbox.billit.be');
    }
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '');

    // Auth check
    const authResponse = await fetch(`${apiBaseUrl}/v1/account/accountInformation`, {
      method: 'GET',
      headers: {
        'ApiKey': credentials.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!authResponse.ok) {
      const authErrorText = await authResponse.text();
      throw new Error(`Clé API Billit invalide: ${authResponse.status} - ${authErrorText}`);
    }

    const accountData = await authResponse.json();
    const companies = accountData?.Companies || [];

    // Fetch EXPENSE invoices (purchase invoices)
    const billitUrl = `${apiBaseUrl}/v1/orders?OrderDirection=Expense&OrderType=Invoice`;
    console.log("📡 Appel API Billit (Expense):", billitUrl);

    const fetchOrders = async (usePartyId: string | null) => {
      const headers: Record<string, string> = {
        'ApiKey': credentials.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (usePartyId) headers['ContextPartyID'] = usePartyId;
      return await fetch(billitUrl, { method: 'GET', headers });
    };

    let billitResponse: Response;
    let usedPartyId: string | null = null;

    // Strategy 1: without ContextPartyID
    billitResponse = await fetchOrders(null);

    if (!billitResponse.ok) {
      // Strategy 2: with configured PartyID
      const configuredPartyId = credentials.companyId?.trim();
      if (configuredPartyId) {
        billitResponse = await fetchOrders(configuredPartyId);
        if (billitResponse.ok) usedPartyId = configuredPartyId;
      }

      // Strategy 3: try each available PartyID
      if (!billitResponse.ok && companies.length > 0) {
        for (const company of companies) {
          const partyId = company.PartyID || company.ID;
          if (partyId && partyId !== configuredPartyId) {
            billitResponse = await fetchOrders(partyId);
            if (billitResponse.ok) {
              usedPartyId = partyId;
              break;
            }
          }
        }
      }
    }

    if (!billitResponse.ok) {
      const errorText = await billitResponse.text();
      throw new Error(`Erreur API Billit (${billitResponse.status}): ${errorText.substring(0, 200)}`);
    }

    const billitData = await billitResponse.json();
    const billitInvoices: BillitInvoice[] = billitData.Items || billitData || [];
    console.log(`📋 ${billitInvoices.length} facture(s) d'achat récupérée(s)`);

    // Get existing purchase invoices to avoid duplicates
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('external_invoice_id')
      .eq('company_id', companyId)
      .eq('invoice_type', 'purchase')
      .not('external_invoice_id', 'is', null);

    const existingExternalIds = new Set(
      (existingInvoices || []).map(inv => inv.external_invoice_id)
    );

    // Get suppliers for name matching
    const { data: suppliersData } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const suppliersList = suppliersData || [];

    // Get contract equipment for matching
    const { data: contractEquipment } = await supabase
      .from('contract_equipment')
      .select(`
        id, title, quantity, purchase_price, supplier_id, supplier_price, order_status,
        contracts!inner(id, contract_number, client_name, company_id)
      `)
      .eq('contracts.company_id', companyId);

    const equipmentItems = contractEquipment || [];

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const billitInvoice of billitInvoices) {
      try {
        const externalId = `purchase-${billitInvoice.OrderID}`;

        if (existingExternalIds.has(externalId)) {
          skippedCount++;
          continue;
        }

        let status = 'draft';
        if (billitInvoice.Paid) status = 'paid';
        else if (billitInvoice.IsSent) status = 'sent';

        // Try to match supplier by name
        const counterPartyName = billitInvoice.CounterParty?.DisplayName?.toLowerCase() || '';
        const matchedSupplier = suppliersList.find(s =>
          s.name.toLowerCase() === counterPartyName ||
          counterPartyName.includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(counterPartyName)
        );

        // Build equipment match suggestions
        const matchSuggestions = equipmentItems
          .map((eq: any) => {
            const eqTotal = (eq.supplier_price || eq.purchase_price) * eq.quantity;
            let score = calculateMatchScore(billitInvoice.TotalExcl, eqTotal);

            // Boost score if supplier matches
            if (matchedSupplier && eq.supplier_id === matchedSupplier.id) {
              score = Math.min(100, score + 20);
            }

            return {
              equipment_id: eq.id,
              equipment_title: eq.title,
              contract_id: eq.contracts?.id,
              contract_number: eq.contracts?.contract_number,
              client_name: eq.contracts?.client_name,
              equipment_total: eqTotal,
              score
            };
          })
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        let pdfUrl = null;
        if (billitInvoice.OrderPDF?.FileID) {
          pdfUrl = `${apiBaseUrl}/v1/files/${billitInvoice.OrderPDF.FileID}`;
        }

        const invoiceData = {
          company_id: companyId,
          external_invoice_id: externalId,
          invoice_number: billitInvoice.OrderNumber,
          amount: billitInvoice.TotalExcl,
          status,
          invoice_type: 'purchase',
          integration_type: 'billit',
          invoice_date: billitInvoice.OrderDate ? new Date(billitInvoice.OrderDate).toISOString() : new Date().toISOString(),
          leaser_name: billitInvoice.CounterParty?.DisplayName || 'Fournisseur Billit',
          contract_id: null,
          pdf_url: pdfUrl,
          sent_at: billitInvoice.IsSent ? new Date().toISOString() : null,
          paid_at: billitInvoice.Paid ? new Date().toISOString() : null,
          billing_data: {
            billit_data: billitInvoice,
            import_source: 'billit_purchase_import',
            billit_supplier_name: billitInvoice.CounterParty?.DisplayName || null,
            billit_supplier_vat: billitInvoice.CounterParty?.VATNumber || null,
            matched_supplier_id: matchedSupplier?.id || null,
            total_incl_vat: billitInvoice.TotalIncl,
            vat_amount: billitInvoice.VATAmount,
            imported_at: new Date().toISOString(),
            match_suggestions: matchSuggestions
          }
        };

        const { error: insertError } = await supabase
          .from('invoices')
          .insert(invoiceData);

        if (insertError) {
          console.error(`❌ Erreur insertion facture achat ${externalId}:`, insertError);
          errors.push(`Facture ${billitInvoice.OrderNumber}: ${insertError.message}`);
          continue;
        }

        importedCount++;
      } catch (invoiceError) {
        errors.push(`Erreur: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
      }
    }

    // Count unmatched purchase invoices
    const { count: unmatchedCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('invoice_type', 'purchase')
      .is('contract_id', null);

    console.log(`✅ Import achats terminé: ${importedCount} importée(s), ${skippedCount} existante(s)`);

    return new Response(JSON.stringify({
      success: true,
      message: `Import terminé: ${importedCount} facture(s) d'achat importée(s)`,
      imported: importedCount,
      skipped: skippedCount,
      total_billit: billitInvoices.length,
      unmatched_count: unmatchedCount || 0,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("❌ Erreur import achats Billit:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Erreur lors de l'import des factures d'achat"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
