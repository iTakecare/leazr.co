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

interface ImportRequest {
  companyId: string;
}

interface ContractMatch {
  id: string;
  client_name: string;
  estimated_selling_price: number;
  monthly_payment: number;
  created_at: string;
  contract_number: string | null;
}

interface LeazrInvoice {
  id: string;
  invoice_number: string | null;
  amount: number;
  leaser_name: string | null;
  offer_id: string | null;
  contract_id: string | null;
}

// Calcul du score de matching basé sur la proximité des montants
const calculateMatchScore = (invoiceAmount: number, contractSellingPrice: number): number => {
  if (!contractSellingPrice || contractSellingPrice === 0) return 0;
  
  const diff = Math.abs(invoiceAmount - contractSellingPrice);
  const percentDiff = (diff / invoiceAmount) * 100;
  
  if (percentDiff <= 1) return 100;
  if (percentDiff <= 3) return 80;
  if (percentDiff <= 5) return 60;
  if (percentDiff <= 10) return 40;
  return 0;
};

// Normaliser un nom pour la comparaison
const normalizeName = (name: string): string => {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

// Vérifier si deux noms sont similaires
const areNamesSimilar = (name1: string, name2: string): boolean => {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (!n1 || !n2) return false;
  return n1.includes(n2) || n2.includes(n1) || n1 === n2;
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
        endpoint: "billit-import-invoices",
        maxRequests: 8,
        windowSeconds: 60,
        identifierPrefix: "billit-import-invoices",
      },
    });

    if (!access.ok) {
      return access.response;
    }

    let payload: ImportRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { companyId } = payload;
    console.log("📥 Début import factures Billit - companyId:", companyId);

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

    // Récupérer les identifiants Billit
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
    
    console.log("🔑 Credentials récupérées:", {
      hasApiKey: !!credentials.apiKey,
      apiKeyLength: credentials.apiKey?.length || 0,
      baseUrl: credentials.baseUrl,
      companyId: credentials.companyId || 'NON_CONFIGURE'
    });
    
    // Corriger l'URL de base si nécessaire
    let apiBaseUrl = credentials.baseUrl;
    if (apiBaseUrl.includes('my.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.billit.be', 'api.billit.be');
    }
    if (apiBaseUrl.includes('my.sandbox.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.sandbox.billit.be', 'api.sandbox.billit.be');
    }
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '');

    // ÉTAPE 1: Vérifier l'authentification
    console.log("🔐 Vérification authentification Billit...");
    const authTestUrl = `${apiBaseUrl}/v1/account/accountInformation`;
    const authResponse = await fetch(authTestUrl, {
      method: 'GET',
      headers: {
        'ApiKey': credentials.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!authResponse.ok) {
      const authErrorText = await authResponse.text();
      console.error("❌ Erreur authentification Billit:", authResponse.status, authErrorText);
      throw new Error(`Clé API Billit invalide: ${authResponse.status} - ${authErrorText}`);
    }

    const accountData = await authResponse.json();
    console.log("✅ Authentification réussie, compte:", accountData?.Email || 'N/A');
    
    const companies = accountData?.Companies || [];

    // ÉTAPE 2: Récupérer les factures - stratégie adaptative
    const billitUrl = `${apiBaseUrl}/v1/orders?OrderDirection=Income&OrderType=Invoice`;
    console.log("📡 Appel API Billit:", billitUrl);

    const fetchOrders = async (usePartyId: string | null) => {
      const headers: Record<string, string> = {
        'ApiKey': credentials.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (usePartyId) {
        headers['ContextPartyID'] = usePartyId;
      }
      return await fetch(billitUrl, { method: 'GET', headers });
    };

    let billitResponse: Response;
    let usedPartyId: string | null = null;
    
    billitResponse = await fetchOrders(null);
    
    if (!billitResponse.ok) {
      const configuredPartyId = credentials.companyId?.trim();
      if (configuredPartyId) {
        billitResponse = await fetchOrders(configuredPartyId);
        if (billitResponse.ok) usedPartyId = configuredPartyId;
      }
      
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
      console.error("❌ Erreur API Billit:", billitResponse.status, errorText);
      throw new Error(`Erreur API Billit (${billitResponse.status}): ${errorText.substring(0, 200)}`);
    }

    const billitData = await billitResponse.json();
    const billitInvoices: BillitInvoice[] = billitData.Items || billitData || [];
    console.log(`📋 ${billitInvoices.length} facture(s) récupérée(s) depuis Billit`);

    // Récupérer les factures avec external_invoice_id (déjà importées)
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('external_invoice_id')
      .eq('company_id', companyId)
      .not('external_invoice_id', 'is', null);

    const existingExternalIds = new Set(
      (existingInvoices || []).map((inv: any) => inv.external_invoice_id)
    );
    console.log(`📊 ${existingExternalIds.size} facture(s) déjà importée(s)`);

    // NOUVEAU: Récupérer les factures Leazr SANS external_invoice_id pour la réconciliation
    const { data: leazrUnlinkedInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, leaser_name, offer_id, contract_id')
      .eq('company_id', companyId)
      .is('external_invoice_id', null);

    const unlinkedInvoices: LeazrInvoice[] = leazrUnlinkedInvoices || [];
    console.log(`🔍 ${unlinkedInvoices.length} facture(s) Leazr sans lien Billit (candidates à la réconciliation)`);

    // Récupérer les contrats sans facture pour le matching classique
    const { data: availableContracts } = await supabase
      .from('contracts')
      .select('id, client_name, estimated_selling_price, monthly_payment, created_at, contract_number')
      .eq('company_id', companyId)
      .eq('invoice_generated', false);

    const contracts: ContractMatch[] = availableContracts || [];
    console.log(`📋 ${contracts.length} contrat(s) disponible(s) pour le matching`);

    let importedCount = 0;
    let skippedCount = 0;
    let reconciledCount = 0;
    const errors: string[] = [];
    const importedInvoices: any[] = [];
    // Track reconciled Leazr invoice IDs to avoid double-matching
    const reconciledLeazrIds = new Set<string>();

    for (const billitInvoice of billitInvoices) {
      try {
        const externalId = billitInvoice.OrderID.toString();
        
        // 1. Skip si déjà importée
        if (existingExternalIds.has(externalId)) {
          skippedCount++;
          continue;
        }

        let status: string = 'draft';
        if (billitInvoice.Paid) {
          status = 'paid';
        } else if (billitInvoice.IsSent) {
          status = 'sent';
        }

        let pdfUrl = null;
        if (billitInvoice.OrderPDF?.FileID) {
          pdfUrl = `${apiBaseUrl}/v1/files/${billitInvoice.OrderPDF.FileID}`;
        }

        // 2. NOUVEAU: Chercher une facture Leazr existante matchant par montant (±2%) et nom client
        const billitAmount = billitInvoice.TotalExcl;
        const billitCustomerName = billitInvoice.CounterParty?.DisplayName || '';

        const existingMatch = unlinkedInvoices.find(inv => {
          if (reconciledLeazrIds.has(inv.id)) return false;
          if (!inv.amount || billitAmount === 0) return false;
          const amountDiff = Math.abs(inv.amount - billitAmount) / billitAmount;
          if (amountDiff > 0.02) return false; // Tolérance ±2%
          // Si le nom client est dispo, vérifier la similarité
          if (billitCustomerName && inv.leaser_name) {
            return areNamesSimilar(billitCustomerName, inv.leaser_name);
          }
          // Match par montant seul si pas de nom
          return true;
        });

        if (existingMatch) {
          // RÉCONCILIATION: lier la facture Leazr existante à Billit
          console.log(`🔗 Réconciliation: facture Leazr ${existingMatch.invoice_number} ↔ Billit ${billitInvoice.OrderNumber} (montant: ${billitAmount})`);
          
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              external_invoice_id: externalId,
              pdf_url: pdfUrl,
              status: status,
              integration_type: 'billit',
              billing_data: {
                billit_data: billitInvoice,
                import_source: 'billit_reconciliation',
                billit_customer_name: billitCustomerName,
                billit_customer_vat: billitInvoice.CounterParty?.VATNumber || null,
                total_incl_vat: billitInvoice.TotalIncl,
                vat_amount: billitInvoice.VATAmount,
                reconciled_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMatch.id);

          if (updateError) {
            console.error(`❌ Erreur réconciliation facture ${existingMatch.id}:`, updateError);
            errors.push(`Réconciliation ${billitInvoice.OrderNumber}: ${updateError.message}`);
          } else {
            reconciledCount++;
            reconciledLeazrIds.add(existingMatch.id);
          }
          continue;
        }

        // 3. Pas de match existant → créer une nouvelle facture (comportement original)
        const matchSuggestions = contracts
          .map(contract => ({
            contract,
            score: calculateMatchScore(billitAmount, contract.estimated_selling_price)
          }))
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        const invoiceData = {
          company_id: companyId,
          external_invoice_id: externalId,
          invoice_number: billitInvoice.OrderNumber,
          amount: billitAmount,
          status,
          integration_type: 'billit',
          invoice_date: billitInvoice.OrderDate ? new Date(billitInvoice.OrderDate).toISOString() : new Date().toISOString(),
          leaser_name: billitCustomerName || 'Client Billit',
          contract_id: null,
          pdf_url: pdfUrl,
          sent_at: billitInvoice.IsSent ? new Date().toISOString() : null,
          paid_at: billitInvoice.Paid ? new Date().toISOString() : null,
          billing_data: {
            billit_data: billitInvoice,
            import_source: 'billit_import',
            billit_customer_name: billitCustomerName || null,
            billit_customer_vat: billitInvoice.CounterParty?.VATNumber || null,
            total_incl_vat: billitInvoice.TotalIncl,
            vat_amount: billitInvoice.VATAmount,
            imported_at: new Date().toISOString(),
            match_suggestions: matchSuggestions.map(m => ({
              contract_id: m.contract.id,
              contract_number: m.contract.contract_number,
              client_name: m.contract.client_name,
              selling_price: m.contract.estimated_selling_price,
              score: m.score
            }))
          }
        };

        const { data: insertedInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Erreur insertion facture ${externalId}:`, insertError);
          errors.push(`Facture ${billitInvoice.OrderNumber}: ${insertError.message}`);
          continue;
        }

        console.log(`✅ Facture ${billitInvoice.OrderNumber} importée avec ${matchSuggestions.length} suggestion(s)`);
        importedCount++;
        
        importedInvoices.push({
          ...insertedInvoice,
          match_suggestions: matchSuggestions.map(m => ({
            contract_id: m.contract.id,
            contract_number: m.contract.contract_number,
            client_name: m.contract.client_name,
            selling_price: m.contract.estimated_selling_price,
            score: m.score
          }))
        });

      } catch (invoiceError) {
        console.error(`❌ Erreur traitement facture:`, invoiceError);
        errors.push(`Erreur: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
      }
    }

    const { count: unmatchedCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('contract_id', null);

    console.log(`✅ Import terminé: ${importedCount} importée(s), ${reconciledCount} réconciliée(s), ${skippedCount} déjà existante(s), ${errors.length} erreur(s)`);

    return new Response(JSON.stringify({
      success: true,
      message: `Import terminé: ${importedCount} importée(s), ${reconciledCount} réconciliée(s)`,
      imported: importedCount,
      reconciled: reconciledCount,
      skipped: skippedCount,
      total_billit: billitInvoices.length,
      unmatched_count: unmatchedCount || 0,
      imported_invoices: importedInvoices,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("❌ Erreur import Billit:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Erreur lors de l'import des factures"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
