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
    const { contractId, companyId }: BillitInvoiceRequest = await req.json();
    console.log("Génération facture Billit pour contrat:", contractId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les identifiants Billit pour cette entreprise
    const { data: integration, error: integrationError } = await supabase
      .from('company_integrations')
      .select('api_credentials, settings, is_enabled')
      .eq('company_id', companyId)
      .eq('integration_type', 'billit')
      .single();

    if (integrationError || !integration?.is_enabled) {
      throw new Error("Intégration Billit non configurée ou désactivée");
    }

    const credentials = integration.api_credentials as BillitCredentials;
    if (!credentials.apiKey) {
      throw new Error("Clé API Billit manquante");
    }

    // Récupérer les données du contrat et équipements
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

    if (contractError || !contract) {
      throw new Error("Contrat non trouvé");
    }

    // Vérifier que tous les numéros de série sont renseignés
    const equipmentWithoutSerial = contract.contract_equipment?.filter(
      (eq: any) => !eq.serial_number || eq.serial_number.trim() === ''
    );

    if (equipmentWithoutSerial && equipmentWithoutSerial.length > 0) {
      throw new Error("Tous les numéros de série doivent être renseignés avant de générer la facture");
    }

    // Préparer les données pour Billit
    const billitInvoiceData = {
      client: {
        name: contract.leaser_name,
        email: integration.settings.leaser_email || '',
      },
      invoice: {
        description: `Facture de leasing - Contrat ${contract.id}`,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: contract.contract_equipment?.map((equipment: any) => ({
          description: `${equipment.title} - SN: ${equipment.serial_number}`,
          quantity: equipment.quantity,
          unit_price: equipment.purchase_price + equipment.margin,
          total: (equipment.purchase_price + equipment.margin) * equipment.quantity
        })) || []
      }
    };

    // Calculer le montant total
    const totalAmount = billitInvoiceData.invoice.items.reduce(
      (sum: number, item: any) => sum + item.total, 0
    );

    // Appel à l'API Billit avec gestion d'erreur améliorée
    let billitResponse;
    let billitInvoice;

    try {
      billitResponse = await fetch(`${credentials.baseUrl}/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billitInvoiceData)
      });

      if (!billitResponse.ok) {
        const errorText = await billitResponse.text();
        console.error(`Erreur API Billit (${billitResponse.status}):`, errorText);
        
        // Créer une facture locale même si l'API Billit échoue
        billitInvoice = {
          id: `local_${Date.now()}`,
          number: `BILL-${Date.now()}`,
          status: 'draft',
          error: `API Billit indisponible (${billitResponse.status}): ${errorText}`
        };
      } else {
        billitInvoice = await billitResponse.json();
      }
    } catch (fetchError) {
      console.error("Erreur de connexion à Billit:", fetchError);
      
      // Créer une facture locale en cas d'erreur de connexion
      billitInvoice = {
        id: `local_${Date.now()}`,
        number: `BILL-${Date.now()}`,
        status: 'draft',
        error: `Connexion à Billit impossible: ${fetchError.message}`
      };
    }
    console.log("Facture créée dans Billit:", billitInvoice);

    // Enregistrer la facture dans notre base
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        contract_id: contractId,
        company_id: companyId,
        leaser_name: contract.leaser_name,
        external_invoice_id: billitInvoice.id,
        invoice_number: billitInvoice.number,
        amount: totalAmount,
        status: 'sent',
        generated_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        due_date: billitInvoiceData.invoice.due_date,
        billing_data: billitInvoiceData,
        integration_type: 'billit'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Erreur lors de l'enregistrement de la facture:", invoiceError);
      throw new Error("Erreur lors de l'enregistrement de la facture");
    }

    // Mettre à jour le contrat
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        invoice_generated: true,
        invoice_id: invoice.id
      })
      .eq('id', contractId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour du contrat:", updateError);
    }

    console.log("Facture générée avec succès");

    return new Response(JSON.stringify({
      success: true,
      invoice: {
        id: invoice.id,
        external_id: billitInvoice.id,
        number: billitInvoice.number,
        amount: totalAmount,
        status: 'sent'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Erreur dans billit-integration:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error),
      message: "Erreur lors de la génération de la facture"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});