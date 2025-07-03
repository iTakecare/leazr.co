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
  console.log("🚀 Edge Function démarrée - Billit Integration");

  if (req.method === 'OPTIONS') {
    console.log("✅ OPTIONS request handled");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'POST') {
    console.error("❌ Méthode non supportée:", req.method);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Méthode non supportée',
      method: req.method 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    console.log("📥 Parsing request body...");
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

    // Vérifier si une facture existe déjà pour ce contrat
    console.log("🔍 Vérification facture existante...");
    const { data: existingInvoices, error: invoiceCheckError } = await supabase
      .from('invoices')
      .select('id, status, external_invoice_id, invoice_number, amount')
      .eq('contract_id', contractId);

    if (invoiceCheckError) {
      console.error("❌ Erreur lors de la vérification des factures existantes:", invoiceCheckError);
      throw new Error(`Erreur lors de la vérification des factures: ${invoiceCheckError.message}`);
    }

    let existingInvoiceId = null;
    let shouldUpdateExisting = false;

    if (existingInvoices && existingInvoices.length > 0) {
      // Si plusieurs factures existent, nettoyer les doublons en gardant la première
      if (existingInvoices.length > 1) {
        console.log(`⚠️ ${existingInvoices.length} factures trouvées, nettoyage des doublons...`);
        
        // Détacher les contrats des factures supplémentaires pour éviter les contraintes FK
        for (let i = 1; i < existingInvoices.length; i++) {
          const duplicateInvoice = existingInvoices[i];
          console.log(`🧹 Suppression du doublon: ${duplicateInvoice.id}`);
          
          // Mettre à jour les contrats qui référencent cette facture
          await supabase
            .from('contracts')
            .update({ invoice_id: null, invoice_generated: false })
            .eq('invoice_id', duplicateInvoice.id);
          
          // Supprimer la facture dupliquée
          await supabase
            .from('invoices')
            .delete()
            .eq('id', duplicateInvoice.id);
        }
      }
      
      const existingInvoice = existingInvoices[0];
      existingInvoiceId = existingInvoice.id;
      shouldUpdateExisting = true;
      console.log(`📝 Facture existante trouvée (${existingInvoice.id}), mise à jour au lieu de suppression`);
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

    // Récupérer les données du leaser pour la facturation avec recherche flexible
    console.log("🏢 Récupération données leaser...");
    const leaserName = contract.leaser_name;
    
    // Essayer d'abord une correspondance exacte
    let { data: leaser, error: leaserError } = await supabase
      .from('leasers')
      .select('*')
      .eq('name', leaserName)
      .single();

    // Si pas de correspondance exacte, essayer une recherche partielle
    if (leaserError || !leaser) {
      console.log("🔍 Recherche partielle pour leaser:", leaserName);
      const partialResult = await supabase
        .from('leasers')
        .select('*')
        .ilike('name', `%${leaserName}%`)
        .single();
        
      if (partialResult.data) {
        leaser = partialResult.data;
        leaserError = null;
        console.log("✅ Leaser trouvé avec recherche partielle:", leaser.name);
      } else {
        leaserError = partialResult.error;
      }
    }

    console.log("🏢 Données leaser:", { leaser, error: leaserError });

    if (leaserError || !leaser) {
      console.error("❌ Leaser non trouvé:", leaserError);
      throw new Error(`Leaser "${leaserName}" non trouvé pour ce contrat`);
    }

    // Valider que les données du leaser sont complètes pour la facturation
    const requiredLeaserFields = ['address', 'city', 'postal_code', 'email'];
    const missingLeaserFields = requiredLeaserFields.filter(field => !leaser[field]);
    
    if (missingLeaserFields.length > 0) {
      console.error("❌ Données leaser incomplètes:", missingLeaserFields);
      throw new Error(`Données leaser incomplètes: ${missingLeaserFields.join(', ')} manquant(s). Veuillez compléter l'adresse du leaser dans les paramètres.`);
    }

    // Récupérer les données client pour information (affiché dans les notes)
    console.log("👥 Récupération données client...");
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', contract.client_id)
      .single();

    console.log("👥 Données client:", { client, error: clientError });

    // Récupérer les paramètres d'intégration avancés
    const integrationSettings = integration.settings || {};
    const supplierContact = integrationSettings.supplier_contact || {};
    
    // Calculer la période de service basée sur la date du contrat
    const contractDate = new Date(contract.created_at);
    const serviceStartDate = contractDate.toISOString().split('T')[0];
    const serviceEndDate = new Date(contractDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 an par défaut

    // Préparer les CustomFields pour le header
    const customFields: any = {
      // Informations contractuelles
      "Invoice.ContractDocumentReference.ID.Text": contract.id,
      "Invoice.ProjectReference.ID.Text": `LEASING-${contract.id.slice(0, 8)}`,
      "Invoice.AccountingCost": `LEASE-${contract.leaser_name}`,
      
      // Période de service
      "Invoice.InvoicePeriod.StartDate": serviceStartDate,
      "Invoice.InvoicePeriod.EndDate": serviceEndDate,
      
      // Notes avec contexte complet
      "Invoice.Note": `Contrat de leasing pour ${contract.equipment_description || 'équipements divers'}. ` +
                     `Référence offre: ${contract.offer_id}. ` +
                     `Client final: ${client?.name || contract.client_name}${client?.company ? ` (${client.company})` : ''}. ` +
                     `Bailleur: ${contract.leaser_name}. ` +
                     `Paiement mensuel: €${contract.monthly_payment}`,
    };

    // Contact leaser (qui sera facturé)
    if (leaser?.email) {
      customFields["Invoice.AccountingCustomerParty.Party.Contact.ElectronicMail"] = leaser.email;
    }
    if (leaser?.phone) {
      customFields["Invoice.AccountingCustomerParty.Party.Contact.Telephone"] = leaser.phone;
    }
    customFields["Invoice.AccountingCustomerParty.Party.Contact.Name"] = leaser.name;

    // Contact fournisseur (leaser/entreprise)
    if (supplierContact.email) {
      customFields["Invoice.AccountingSupplierParty.Party.Contact.ElectronicMail"] = supplierContact.email;
    }
    if (supplierContact.phone) {
      customFields["Invoice.AccountingSupplierParty.Party.Contact.Telephone"] = supplierContact.phone;
    }
    if (supplierContact.name) {
      customFields["Invoice.AccountingSupplierParty.Party.Contact.Name"] = supplierContact.name;
    }

    // Informations de livraison si disponibles
    if (contract.tracking_number) {
      customFields["Invoice.Delivery.DeliveryLocation.ID.Text"] = contract.tracking_number;
    }
    
    // Termes de paiement personnalisés
    customFields["PaymentTerms"] = "Paiement selon termes du contrat de leasing";
    customFields["PaymentMeansCode"] = "58"; // Code pour prélèvement automatique

    // Préparer les données pour Billit selon la documentation officielle
    const billitInvoiceData = {
      OrderType: "Invoice",
      OrderDirection: "Income",
      OrderNumber: `CON-${contract.id.slice(0, 8)}`,
      OrderDate: new Date().toISOString().split('T')[0],
      ExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Reference: contract.id,
      CustomFields: customFields,
      Customer: {
        Name: leaser.name,
        VATNumber: leaser.vat_number || '',
        PartyType: "Customer",
        Addresses: [
          {
            AddressType: "InvoiceAddress",
            Name: leaser.name,
            Street: leaser.address,
            StreetNumber: "", // Pourrait être extrait de l'adresse si besoin
            City: leaser.city,
            PostalCode: leaser.postal_code,
            CountryCode: leaser.country || 'BE'
          }
        ]
      },
      OrderLines: contract.contract_equipment?.map((equipment: any, index: number) => {
        // Gérer les serial_number qui peuvent être des arrays ou des strings
        const serialNumber = Array.isArray(equipment.serial_number) 
          ? equipment.serial_number[0] || '' 
          : equipment.serial_number || '';
        
        // Préparer les CustomFields pour cette ligne
        const lineCustomFields: any = {
          "PeppolUnitCode": "C62", // Code pour "unité" dans Peppol
          "PeppolLineID": (index + 1).toString(),
          "InvoiceLine.InvoicePeriod.StartDate": serviceStartDate,
          "InvoiceLine.InvoicePeriod.EndDate": serviceEndDate,
        };

        // Ajouter les informations détaillées dans les notes de ligne
        let lineNote = `Équipement: ${equipment.title}`;
        if (serialNumber) {
          lineNote += ` | Numéro de série: ${serialNumber}`;
        }
        if (equipment.collaborator_id) {
          lineNote += ` | Assigné au collaborateur ID: ${equipment.collaborator_id}`;
        }
        lineNote += ` | Prix d'achat: €${equipment.purchase_price} | Marge: €${equipment.margin}`;
        
        lineCustomFields["InvoiceLine.Note"] = lineNote;

        // Classification produit générique pour équipements IT
        lineCustomFields["InvoiceLine.Item.CommodityClassification.ItemClassificationCode.Text"] = "43210000";
        lineCustomFields["InvoiceLine.Item.CommodityClassification.ItemClassificationCode.ListID"] = "CPV";
        
        return {
          Quantity: equipment.quantity,
          UnitPriceExcl: equipment.purchase_price + equipment.margin,
          Description: equipment.title,
          CustomFields: lineCustomFields,
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
    let invoiceSent = false;

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

        // Tentative d'envoi automatique de la facture
        try {
          console.log("📤 Tentative d'envoi automatique de la facture...");
          const sendUrl = `${credentials.baseUrl}/v1/orders/commands/send`;
          const sendData = {
            Transporttype: "Peppol",
            OrderIDs: [billitInvoice.id]
          };

          const sendResponse = await fetch(sendUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sendData)
          });

          if (sendResponse.ok) {
            invoiceSent = true;
            console.log("✅ Facture envoyée avec succès via Billit");
          } else {
            const sendErrorText = await sendResponse.text();
            console.log(`⚠️ Impossible d'envoyer la facture automatiquement (${sendResponse.status}):`, sendErrorText);
            console.log("📋 La facture a été créée mais devra être envoyée manuellement");
          }
        } catch (sendError) {
          console.log("⚠️ Erreur lors de l'envoi automatique:", sendError);
          console.log("📋 La facture a été créée mais devra être envoyée manuellement");
        }
      }
    } catch (fetchError) {
      console.error("❌ Erreur de connexion à Billit:", fetchError);
      throw new Error(`Connexion à Billit impossible: ${fetchError.message}`);
    }

    // Récupérer les détails complets de la facture depuis Billit
    console.log("🔍 Récupération détails facture Billit...");
    let fullInvoiceDetails = null;
    let billitPdfUrl = null;
    let realStatus = invoiceSent ? 'sent' : (billitSuccess ? 'created' : 'draft');
    
    try {
      const detailsResponse = await fetch(`${credentials.baseUrl}/v1/orders/${billitInvoice.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (detailsResponse.ok) {
        fullInvoiceDetails = await detailsResponse.json();
        console.log("✅ Détails Billit récupérés:", {
          OrderStatus: fullInvoiceDetails.OrderStatus,
          IsSent: fullInvoiceDetails.IsSent,
          Paid: fullInvoiceDetails.Paid,
          hasPDF: !!fullInvoiceDetails.OrderPDF
        });

        // Déterminer le statut réel basé sur les données Billit
        if (fullInvoiceDetails.Paid) {
          realStatus = 'paid';
        } else if (fullInvoiceDetails.IsSent) {
          realStatus = 'sent';
        } else if (fullInvoiceDetails.OrderStatus === 'ToSend') {
          realStatus = 'created';
        }

        // Récupérer l'URL du PDF si disponible
        if (fullInvoiceDetails.OrderPDF && fullInvoiceDetails.OrderPDF.FileID) {
          billitPdfUrl = `${credentials.baseUrl}/v1/files/${fullInvoiceDetails.OrderPDF.FileID}`;
        }
      } else {
        console.log("⚠️ Impossible de récupérer les détails Billit, utilisation des données de base");
      }
    } catch (detailsError) {
      console.log("⚠️ Erreur lors de la récupération des détails:", detailsError);
    }

    // Enregistrer ou mettre à jour la facture dans notre base
    console.log("💾 Enregistrement/mise à jour facture locale...");
    let invoice;
    let invoiceError;

    if (shouldUpdateExisting && existingInvoiceId) {
      // Mise à jour de la facture existante
      console.log(`📝 Mise à jour facture existante: ${existingInvoiceId}`);
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          external_invoice_id: billitInvoice.id,
          invoice_number: billitInvoice.number || billitInvoice.id,
          amount: totalAmount,
          status: realStatus,
          generated_at: new Date().toISOString(),
          sent_at: (realStatus === 'sent' || realStatus === 'paid') ? new Date().toISOString() : null,
          paid_at: realStatus === 'paid' ? new Date().toISOString() : null,
          due_date: billitInvoiceData.ExpiryDate,
          pdf_url: billitPdfUrl,
          billing_data: {
            ...billitInvoiceData,
            billit_response: billitInvoice,
            billit_details: fullInvoiceDetails,
            success: billitSuccess,
            updated_at: new Date().toISOString()
          },
          integration_type: 'billit',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInvoiceId)
        .select()
        .single();
      
      invoice = updatedInvoice;
      invoiceError = updateError;
    } else {
      // Création d'une nouvelle facture
      console.log("🆕 Création nouvelle facture");
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          contract_id: contractId,
          company_id: companyId,
          leaser_name: contract.leaser_name,
          external_invoice_id: billitInvoice.id,
          invoice_number: billitInvoice.number || billitInvoice.id,
          amount: totalAmount,
          status: realStatus,
          generated_at: new Date().toISOString(),
          sent_at: (realStatus === 'sent' || realStatus === 'paid') ? new Date().toISOString() : null,
          paid_at: realStatus === 'paid' ? new Date().toISOString() : null,
          due_date: billitInvoiceData.ExpiryDate,
          pdf_url: billitPdfUrl,
          billing_data: {
            ...billitInvoiceData,
            billit_response: billitInvoice,
            billit_details: fullInvoiceDetails,
            success: billitSuccess
          },
          integration_type: 'billit'
        })
        .select()
        .single();
      
      invoice = newInvoice;
      invoiceError = insertError;
    }

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
        status: invoiceSent ? 'sent' : (billitSuccess ? 'created' : 'draft'),
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
    console.error("📚 Stack trace:", error.stack);
    
    // Déterminer le type d'erreur pour un meilleur diagnostic
    let errorCategory = "unknown";
    let userMessage = "Erreur lors de la génération de la facture";
    
    if (error.message?.includes("Variables d'environnement")) {
      errorCategory = "environment";
      userMessage = "Configuration serveur manquante";
    } else if (error.message?.includes("Intégration Billit")) {
      errorCategory = "integration";
      userMessage = "Intégration Billit non configurée ou désactivée";
    } else if (error.message?.includes("Contrat non trouvé") || error.message?.includes("Client non trouvé")) {
      errorCategory = "data";
      userMessage = "Données manquantes pour générer la facture";
    } else if (error.message?.includes("Numéros de série")) {
      errorCategory = "serial_numbers";
      userMessage = "Numéros de série manquants sur les équipements";
    } else if (error.message?.includes("API Billit") || error.message?.includes("Connexion à Billit")) {
      errorCategory = "billit_api";
      userMessage = "Erreur de communication avec Billit";
    } else if (error.message?.includes("unique constraint")) {
      errorCategory = "database";
      userMessage = "Contrainte de base de données violée";
    }
    
    console.error(`🏷️ Catégorie d'erreur: ${errorCategory}`);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || String(error),
      message: userMessage,
      error_category: errorCategory,
      timestamp: new Date().toISOString(),
      details: {
        stack: error.stack,
        name: error.name,
        cause: error.cause
      }
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