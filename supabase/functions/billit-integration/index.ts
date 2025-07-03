import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BillitInvoiceRequest {
  contractId: string;
  companyId: string;
  testMode?: boolean;
}

interface BillitTestRequest {
  companyId: string;
  testMode: true;
}

interface BillitCredentials {
  apiKey: string;
  baseUrl: string;
  companyId: string;
}

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
    const requestData: BillitInvoiceRequest | BillitTestRequest = await req.json();
    console.log("🔄 Début requête Billit:", JSON.stringify(requestData, null, 2));

    // Mode test de l'intégration
    if (requestData.testMode) {
      return await handleBillitTest(requestData.companyId);
    }

    const { contractId, companyId } = requestData as BillitInvoiceRequest;
    console.log("📋 Génération facture Billit pour contrat:", contractId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les identifiants Billit pour cette entreprise
    console.log("🔍 Recherche intégration Billit pour company_id:", companyId);
    const { data: integration, error: integrationError } = await supabase
      .from('company_integrations')
      .select('api_credentials, settings, is_enabled')
      .eq('company_id', companyId)
      .eq('integration_type', 'billit')
      .single();

    console.log("📡 Résultat intégration:", { integration, error: integrationError });

    if (integrationError) {
      console.error("❌ Erreur récupération intégration:", integrationError);
      throw new Error(`Intégration Billit non trouvée: ${integrationError.message}`);
    }

    if (!integration?.is_enabled) {
      console.error("❌ Intégration Billit désactivée");
      throw new Error("Intégration Billit désactivée");
    }

    const credentials = integration.api_credentials as BillitCredentials;
    console.log("🔑 Vérification credentials:", {
      hasApiKey: !!credentials.apiKey,
      baseUrl: credentials.baseUrl,
      companyId: credentials.companyId
    });

    if (!credentials.apiKey) {
      console.error("❌ Clé API Billit manquante");
      throw new Error("Clé API Billit manquante dans la configuration");
    }

    if (!credentials.baseUrl) {
      console.error("❌ URL de base Billit manquante");
      throw new Error("URL de base Billit manquante dans la configuration");
    }

    // Vérifier si une facture existe déjà pour ce contrat et la supprimer si nécessaire
    console.log("🔍 Vérification facture existante...");
    const { data: existingInvoices, error: invoiceCheckError } = await supabase
      .from('invoices')
      .select('id, status, external_invoice_id')
      .eq('contract_id', contractId);

    if (invoiceCheckError) {
      console.error("❌ Erreur lors de la vérification des factures existantes:", invoiceCheckError);
      throw new Error(`Erreur lors de la vérification des factures: ${invoiceCheckError.message}`);
    }

    if (existingInvoices && existingInvoices.length > 0) {
      const existingInvoice = existingInvoices[0];
      console.log("⚠️ Facture existante trouvée, suppression en cours:", existingInvoice.id);
      
      // Supprimer l'ancienne facture pour permettre la régénération
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', existingInvoice.id);
      
      if (deleteError) {
        console.error("❌ Erreur lors de la suppression de l'ancienne facture:", deleteError);
        throw new Error(`Impossible de supprimer l'ancienne facture: ${deleteError.message}`);
      }
      
      console.log("✅ Ancienne facture supprimée avec succès");
    }

    // Récupérer les données du contrat et équipements
    console.log("📄 Récupération contrat:", contractId);
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        contract_equipment (
          id,
          title,
          quantity,
          purchase_price,
          margin,
          serial_number
        )
      `)
      .eq('id', contractId)
      .single();

    console.log("📄 Données contrat:", { contract, error: contractError });

    if (contractError) {
      console.error("❌ Erreur récupération contrat:", contractError);
      throw new Error(`Contrat non trouvé: ${contractError.message}`);
    }

    if (!contract) {
      console.error("❌ Contrat vide");
      throw new Error("Aucune donnée trouvée pour ce contrat");
    }

    // Vérifier que tous les numéros de série sont renseignés
    console.log("🔢 Vérification numéros de série...");
    const equipmentWithoutSerial = contract.contract_equipment?.filter(
      (eq: any) => {
        // Gérer les serial_number qui peuvent être des arrays ou des strings
        const serialNumber = Array.isArray(eq.serial_number) 
          ? eq.serial_number[0] || '' 
          : eq.serial_number || '';
        return !serialNumber || serialNumber.trim() === '';
      }
    );

    console.log("📦 Équipements sans numéro de série:", equipmentWithoutSerial);

    if (equipmentWithoutSerial && equipmentWithoutSerial.length > 0) {
      const missingEquipment = equipmentWithoutSerial.map((eq: any) => eq.title).join(', ');
      console.error("❌ Numéros de série manquants pour:", missingEquipment);
      throw new Error(`Numéros de série manquants pour: ${missingEquipment}`);
    }

    // Récupérer les données client pour la facturation
    console.log("👥 Récupération données client...");
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', contract.client_id)
      .single();

    console.log("👥 Données client:", { client, error: clientError });

    // Préparer les données pour Billit selon la documentation officielle
    const billitInvoiceData = {
      OrderType: "Invoice",
      OrderDirection: "Income",
      OrderNumber: `CON-${contract.id.slice(0, 8)}`,
      OrderDate: new Date().toISOString().split('T')[0],
      ExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Reference: contract.id,
      Customer: {
        Name: client?.name || contract.client_name || "Client non spécifié",
        VATNumber: client?.vat_number || '',
        PartyType: "Customer",
        Addresses: [
          {
            AddressType: "InvoiceAddress",
            Name: client?.name || contract.client_name || "Client non spécifié",
            Street: client?.address || "Adresse non spécifiée",
            City: client?.city || "Ville non spécifiée",
            PostalCode: client?.postal_code || "0000",
            CountryCode: client?.country || 'BE'
          }
        ]
      },
      OrderLines: contract.contract_equipment?.map((equipment: any) => {
        // Gérer les serial_number qui peuvent être des arrays ou des strings
        const serialNumber = Array.isArray(equipment.serial_number) 
          ? equipment.serial_number[0] || '' 
          : equipment.serial_number || '';
        
        return {
          Quantity: equipment.quantity,
          UnitPriceExcl: equipment.purchase_price + equipment.margin,
          Description: `${equipment.title}${serialNumber ? ` - SN: ${serialNumber}` : ''}`,
          VATPercentage: 21 // TVA par défaut en Belgique
        };
      }) || []
    };

    console.log("📋 Données Billit préparées:", JSON.stringify(billitInvoiceData, null, 2));

    // Calculer le montant total
    const totalAmount = billitInvoiceData.OrderLines.reduce(
      (sum: number, item: any) => sum + (item.UnitPriceExcl * item.Quantity), 0
    );

    // Appel à l'API Billit avec le bon endpoint selon la documentation
    console.log("🚀 Envoi à l'API Billit...");
    const billitUrl = `${credentials.baseUrl}/v1/orders`;
    console.log("🔗 URL Billit:", billitUrl);

    let billitResponse;
    let billitInvoice;
    let billitSuccess = false;

    try {
      billitResponse = await fetch(billitUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billitInvoiceData)
      });

      console.log("📡 Réponse Billit status:", billitResponse.status);
      
      if (!billitResponse.ok) {
        const errorText = await billitResponse.text();
        console.error(`❌ Erreur API Billit (${billitResponse.status}):`, errorText);
        
        // NE PAS créer de facture locale si Billit échoue
        throw new Error(`Erreur API Billit (${billitResponse.status}): ${errorText}`);
      } else {
        billitInvoice = await billitResponse.json();
        billitSuccess = true;
        console.log("✅ Facture créée dans Billit:", billitInvoice);
      }
    } catch (fetchError) {
      console.error("❌ Erreur de connexion à Billit:", fetchError);
      throw new Error(`Connexion à Billit impossible: ${fetchError.message}`);
    }

    // Enregistrer la facture dans notre base seulement si Billit a réussi
    console.log("💾 Enregistrement facture locale...");
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        contract_id: contractId,
        company_id: companyId,
        leaser_name: contract.leaser_name,
        external_invoice_id: billitInvoice.id,
        invoice_number: billitInvoice.number || billitInvoice.id,
        amount: totalAmount,
        status: billitSuccess ? 'sent' : 'draft',
        generated_at: new Date().toISOString(),
        sent_at: billitSuccess ? new Date().toISOString() : null,
        due_date: billitInvoiceData.ExpiryDate,
        billing_data: {
          ...billitInvoiceData,
          billit_response: billitInvoice,
          success: billitSuccess
        },
        integration_type: 'billit'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("❌ Erreur lors de l'enregistrement de la facture:", invoiceError);
      throw new Error(`Erreur lors de l'enregistrement de la facture: ${invoiceError.message}`);
    }

    console.log("✅ Facture enregistrée:", invoice.id);

    // Mettre à jour le contrat
    console.log("📝 Mise à jour contrat...");
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        invoice_generated: true,
        invoice_id: invoice.id
      })
      .eq('id', contractId);

    if (updateError) {
      console.error("❌ Erreur lors de la mise à jour du contrat:", updateError);
      // Ne pas bloquer le processus pour cette erreur
    }

    console.log("✅ Facture générée avec succès dans Billit!");

    return new Response(JSON.stringify({
      success: true,
      invoice: {
        id: invoice.id,
        external_id: billitInvoice.id,
        number: billitInvoice.number || billitInvoice.id,
        amount: totalAmount,
        status: billitSuccess ? 'sent' : 'draft',
        billit_success: billitSuccess
      },
      message: billitSuccess ? 
        "Facture créée avec succès dans Billit" : 
        "Facture créée localement, mais erreur Billit"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("❌ Erreur dans billit-integration:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || String(error),
      message: "Erreur lors de la génération de la facture",
      details: String(error)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Fonction de test de l'intégration Billit
async function handleBillitTest(companyId: string) {
  try {
    console.log("🧪 Test de l'intégration Billit pour company_id:", companyId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Vérifier l'intégration
    const { data: integration, error: integrationError } = await supabase
      .from('company_integrations')
      .select('api_credentials, settings, is_enabled')
      .eq('company_id', companyId)
      .eq('integration_type', 'billit')
      .single();

    const testResults = {
      integration_found: !integrationError,
      integration_enabled: integration?.is_enabled || false,
      has_credentials: false,
      api_test: false,
      errors: [] as string[]
    };

    if (integrationError) {
      testResults.errors.push(`Intégration non trouvée: ${integrationError.message}`);
      return new Response(JSON.stringify({
        success: false,
        test_results: testResults,
        message: "Intégration Billit non configurée"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const credentials = integration.api_credentials as BillitCredentials;
    testResults.has_credentials = !!(credentials.apiKey && credentials.baseUrl);

    if (!testResults.has_credentials) {
      testResults.errors.push("Credentials manquantes (apiKey ou baseUrl)");
    }

    // Test 2: Test API Billit si credentials disponibles
    if (testResults.has_credentials) {
      try {
        console.log("🔌 Test de connexion à l'API Billit...");
        // Tester la connectivité de base avec l'URL fournie
        // On teste d'abord si l'URL répond, puis si l'authentification fonctionne
        const testResponse = await fetch(credentials.baseUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          }
        });

        // Accepter les codes 200, 401 (non autorisé mais l'API répond), 404 (endpoint racine n'existe pas mais l'API répond)
        testResults.api_test = testResponse.status === 200 || testResponse.status === 401 || testResponse.status === 404;
        
        if (!testResults.api_test) {
          const errorText = await testResponse.text();
          testResults.errors.push(`API inaccessible (${testResponse.status}): ${errorText}`);
        } else if (testResponse.status === 401) {
          testResults.errors.push(`API accessible mais clé API invalide (401). Vérifiez votre clé API.`);
        } else if (testResponse.status === 404) {
          // C'est OK, l'API répond mais l'endpoint racine n'existe pas
          console.log("✅ API Billit accessible (404 sur endpoint racine est normal)");
        }
      } catch (apiError) {
        testResults.errors.push(`Erreur connexion API: ${apiError.message}`);
      }
    }

    const allTestsPassed = testResults.integration_found && 
                          testResults.integration_enabled && 
                          testResults.has_credentials && 
                          testResults.api_test;

    return new Response(JSON.stringify({
      success: allTestsPassed,
      test_results: testResults,
      message: allTestsPassed ? 
        "✅ Intégration Billit fonctionnelle" : 
        "❌ Problèmes détectés avec l'intégration Billit"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("❌ Erreur test Billit:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Erreur lors du test de l'intégration",
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}