import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

// Calcul du score de matching basé sur la proximité des montants
const calculateMatchScore = (invoiceAmount: number, contractSellingPrice: number): number => {
  if (!contractSellingPrice || contractSellingPrice === 0) return 0;
  
  const diff = Math.abs(invoiceAmount - contractSellingPrice);
  const percentDiff = (diff / invoiceAmount) * 100;
  
  if (percentDiff <= 1) return 100;  // Match parfait (±1%)
  if (percentDiff <= 3) return 80;   // Très bon match (±3%)
  if (percentDiff <= 5) return 60;   // Bon match (±5%)
  if (percentDiff <= 10) return 40;  // Match possible (±10%)
  return 0;  // Pas de match
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
    const { companyId }: ImportRequest = await req.json();
    console.log("📥 Début import factures Billit - companyId:", companyId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // Corriger l'URL de base si nécessaire (my.billit.be -> api.billit.be)
    let apiBaseUrl = credentials.baseUrl;
    if (apiBaseUrl.includes('my.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.billit.be', 'api.billit.be');
      console.log("🔄 URL corrigée: my.billit.be → api.billit.be");
    }
    if (apiBaseUrl.includes('my.sandbox.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.sandbox.billit.be', 'api.sandbox.billit.be');
      console.log("🔄 URL corrigée: my.sandbox.billit.be → api.sandbox.billit.be");
    }
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '');

    // ÉTAPE 1: D'abord vérifier l'authentification et récupérer les entreprises
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
    
    // Analyser les entreprises disponibles
    const companies = accountData?.Companies || [];
    console.log(`📋 ${companies.length} entreprise(s) trouvée(s)`);
    companies.forEach((c: any, i: number) => {
      console.log(`  ${i + 1}. ${c.Name || c.CommercialName} - PartyID: ${c.PartyID || c.ID}`);
    });

    // ÉTAPE 2: Récupérer les factures - stratégie adaptative
    const billitUrl = `${apiBaseUrl}/v1/orders?OrderDirection=Income&OrderType=Invoice`;
    console.log("📡 Appel API Billit:", billitUrl);

    // Fonction helper pour faire l'appel API
    const fetchOrders = async (usePartyId: string | null) => {
      const headers: Record<string, string> = {
        'ApiKey': credentials.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (usePartyId) {
        headers['ContextPartyID'] = usePartyId;
        console.log("📌 Tentative avec ContextPartyID:", usePartyId);
      } else {
        console.log("📌 Tentative SANS ContextPartyID");
      }
      
      return await fetch(billitUrl, {
        method: 'GET',
        headers
      });
    };

    let billitResponse: Response;
    let usedPartyId: string | null = null;
    
    // Stratégie adaptative: essayer plusieurs approches
    // 1. D'abord sans ContextPartyID (fonctionne souvent pour compte mono-entreprise)
    console.log("🔄 Stratégie 1: Sans ContextPartyID...");
    billitResponse = await fetchOrders(null);
    
    if (!billitResponse.ok) {
      const errorText1 = await billitResponse.text();
      console.log("⚠️ Stratégie 1 échouée:", billitResponse.status, errorText1.substring(0, 100));
      
      // 2. Essayer avec le PartyID configuré si présent
      const configuredPartyId = credentials.companyId?.trim();
      if (configuredPartyId) {
        console.log("🔄 Stratégie 2: Avec PartyID configuré:", configuredPartyId);
        billitResponse = await fetchOrders(configuredPartyId);
        
        if (billitResponse.ok) {
          usedPartyId = configuredPartyId;
        }
      }
      
      // 3. Si toujours en échec et qu'on a des entreprises, essayer chaque PartyID
      if (!billitResponse.ok && companies.length > 0) {
        console.log("🔄 Stratégie 3: Essai de chaque PartyID disponible...");
        
        for (const company of companies) {
          const partyId = company.PartyID || company.ID;
          if (partyId && partyId !== configuredPartyId) {
            console.log(`  → Tentative avec ${company.Name || company.CommercialName}: ${partyId}`);
            billitResponse = await fetchOrders(partyId);
            
            if (billitResponse.ok) {
              usedPartyId = partyId;
              console.log(`✅ Succès avec PartyID: ${partyId} (${company.Name || company.CommercialName})`);
              break;
            }
          }
        }
      }
    }

    if (!billitResponse.ok) {
      const errorText = await billitResponse.text();
      console.error("❌ Erreur API Billit après toutes tentatives:", billitResponse.status, errorText);
      
      // Analyser l'erreur pour donner un message clair
      if (errorText.includes('InvalidOrExpiredLicense')) {
        throw new Error(`Erreur Billit: Licence invalide ou expirée. Veuillez vérifier votre abonnement Billit.`);
      } else if (errorText.includes('ApiKeyNotValid')) {
        throw new Error(`Erreur Billit: Clé API invalide. Vérifiez que la clé API est correcte.`);
      } else if (errorText.includes('Unauthorized')) {
        throw new Error(`Erreur Billit: Accès non autorisé. Vérifiez les permissions de la clé API.`);
      }
      
      const partyIdOptions = companies.map((c: any) => `${c.Name || c.CommercialName}: ${c.PartyID || c.ID}`).join(', ');
      throw new Error(`Erreur API Billit (${billitResponse.status}): ${errorText.substring(0, 200)}. PartyIDs disponibles: ${partyIdOptions}`);
    }
    
    if (usedPartyId) {
      console.log(`📌 PartyID utilisé avec succès: ${usedPartyId}`);
    } else {
      console.log(`📌 Accès réussi sans ContextPartyID`);
    }

    const billitData = await billitResponse.json();
    const billitInvoices: BillitInvoice[] = billitData.Items || billitData || [];
    console.log(`📋 ${billitInvoices.length} facture(s) récupérée(s) depuis Billit`);

    // Récupérer les factures existantes pour éviter les doublons
    const { data: existingInvoices, error: existingError } = await supabase
      .from('invoices')
      .select('external_invoice_id')
      .eq('company_id', companyId)
      .not('external_invoice_id', 'is', null);

    if (existingError) {
      console.error("❌ Erreur récupération factures existantes:", existingError);
    }

    const existingExternalIds = new Set(
      (existingInvoices || []).map(inv => inv.external_invoice_id)
    );
    console.log(`📊 ${existingExternalIds.size} facture(s) déjà importée(s)`);

    // Récupérer tous les contrats sans facture pour le matching
    const { data: availableContracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, client_name, estimated_selling_price, monthly_payment, created_at, contract_number')
      .eq('company_id', companyId)
      .eq('invoice_generated', false);

    if (contractsError) {
      console.error("⚠️ Erreur récupération contrats:", contractsError);
    }

    const contracts: ContractMatch[] = availableContracts || [];
    console.log(`📋 ${contracts.length} contrat(s) disponible(s) pour le matching`);

    let importedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    const importedInvoices: any[] = [];

    // Traiter chaque facture Billit
    for (const billitInvoice of billitInvoices) {
      try {
        const externalId = billitInvoice.OrderID.toString();
        
        // Vérifier si déjà importée
        if (existingExternalIds.has(externalId)) {
          console.log(`⏭️ Facture ${externalId} déjà importée, skip`);
          skippedCount++;
          continue;
        }

        // Déterminer le statut
        let status: string = 'draft';
        if (billitInvoice.Paid) {
          status = 'paid';
        } else if (billitInvoice.IsSent) {
          status = 'sent';
        }

        // Calculer les suggestions de matching
        const matchSuggestions = contracts
          .map(contract => ({
            contract,
            score: calculateMatchScore(billitInvoice.TotalExcl, contract.estimated_selling_price)
          }))
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        // Construire l'URL du PDF si disponible
        let pdfUrl = null;
        if (billitInvoice.OrderPDF?.FileID) {
          pdfUrl = `${apiBaseUrl}/v1/files/${billitInvoice.OrderPDF.FileID}`;
        }

        // Créer la facture en base
        const invoiceData = {
          company_id: companyId,
          external_invoice_id: externalId,
          invoice_number: billitInvoice.OrderNumber,
          amount: billitInvoice.TotalExcl,
          status,
          integration_type: 'billit',
          invoice_date: billitInvoice.OrderDate ? new Date(billitInvoice.OrderDate).toISOString() : new Date().toISOString(),
          leaser_name: billitInvoice.CounterParty?.DisplayName || 'Client Billit',
          contract_id: null, // Sera rempli lors du matching manuel
          pdf_url: pdfUrl,
          sent_at: billitInvoice.IsSent ? new Date().toISOString() : null,
          paid_at: billitInvoice.Paid ? new Date().toISOString() : null,
          billing_data: {
            billit_data: billitInvoice,
            import_source: 'billit_import',
            billit_customer_name: billitInvoice.CounterParty?.DisplayName || null,
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

    // Récupérer le compte des factures sans contrat
    const { count: unmatchedCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('contract_id', null);

    console.log(`✅ Import terminé: ${importedCount} importée(s), ${skippedCount} déjà existante(s), ${errors.length} erreur(s)`);

    return new Response(JSON.stringify({
      success: true,
      message: `Import terminé: ${importedCount} facture(s) importée(s)`,
      imported: importedCount,
      skipped: skippedCount,
      updated: updatedCount,
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
