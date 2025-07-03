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

interface SyncRequest {
  companyId: string;
  invoiceId?: string; // Pour synchroniser une facture spécifique
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
    const { companyId, invoiceId }: SyncRequest = await req.json();
    console.log("🔄 Début synchronisation Billit statuts - companyId:", companyId, "invoiceId:", invoiceId);

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

    // Construire la requête pour récupérer les factures à synchroniser
    let invoicesQuery = supabase
      .from('invoices')
      .select('id, external_invoice_id, status, sent_at, paid_at')
      .eq('company_id', companyId)
      .eq('integration_type', 'billit')
      .not('external_invoice_id', 'is', null);

    if (invoiceId) {
      invoicesQuery = invoicesQuery.eq('id', invoiceId);
    }

    const { data: invoices, error: invoicesError } = await invoicesQuery;

    if (invoicesError) {
      console.error("❌ Erreur récupération factures:", invoicesError);
      throw new Error(`Erreur lors de la récupération des factures: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Aucune facture à synchroniser",
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`📋 ${invoices.length} facture(s) à synchroniser`);

    let updatedCount = 0;
    const errors: string[] = [];

    // Synchroniser chaque facture
    for (const invoice of invoices) {
      try {
        console.log(`🔍 Synchronisation facture ${invoice.id} (Billit ID: ${invoice.external_invoice_id})`);

        // Récupérer les détails depuis Billit
        const detailsResponse = await fetch(`${credentials.baseUrl}/v1/orders/${invoice.external_invoice_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          }
        });

        if (!detailsResponse.ok) {
          const errorText = await detailsResponse.text();
          console.error(`❌ Erreur API Billit pour facture ${invoice.id}:`, errorText);
          errors.push(`Facture ${invoice.id}: ${errorText}`);
          continue;
        }

        const billitDetails = await detailsResponse.json();
        console.log("📊 Détails Billit:", {
          OrderStatus: billitDetails.OrderStatus,
          IsSent: billitDetails.IsSent,
          Paid: billitDetails.Paid,
          hasPDF: !!billitDetails.OrderPDF
        });

        // Déterminer le nouveau statut
        let newStatus = invoice.status;
        let newSentAt = invoice.sent_at;
        let newPaidAt = invoice.paid_at;
        let newPdfUrl = null;

        if (billitDetails.Paid && invoice.status !== 'paid') {
          newStatus = 'paid';
          newPaidAt = new Date().toISOString();
          if (!newSentAt) {
            newSentAt = new Date().toISOString();
          }
        } else if (billitDetails.IsSent && invoice.status === 'created') {
          newStatus = 'sent';
          newSentAt = new Date().toISOString();
        }

        // Récupérer l'URL du PDF si disponible
        if (billitDetails.OrderPDF && billitDetails.OrderPDF.FileID) {
          newPdfUrl = `${credentials.baseUrl}/v1/files/${billitDetails.OrderPDF.FileID}`;
        }

        // Mettre à jour la facture si des changements sont détectés
        if (newStatus !== invoice.status || newSentAt !== invoice.sent_at || newPaidAt !== invoice.paid_at || newPdfUrl) {
          const updateData: any = {
            status: newStatus,
            sent_at: newSentAt,
            paid_at: newPaidAt,
            billing_data: {
              ...((invoice as any).billing_data || {}),
              billit_details: billitDetails,
              last_sync: new Date().toISOString()
            }
          };

          if (newPdfUrl) {
            updateData.pdf_url = newPdfUrl;
          }

          const { error: updateError } = await supabase
            .from('invoices')
            .update(updateData)
            .eq('id', invoice.id);

          if (updateError) {
            console.error(`❌ Erreur mise à jour facture ${invoice.id}:`, updateError);
            errors.push(`Facture ${invoice.id}: ${updateError.message}`);
          } else {
            console.log(`✅ Facture ${invoice.id} mise à jour: ${invoice.status} → ${newStatus}`);
            updatedCount++;
          }
        } else {
          console.log(`ℹ️ Facture ${invoice.id} déjà à jour`);
        }

      } catch (invoiceError) {
        console.error(`❌ Erreur traitement facture ${invoice.id}:`, invoiceError);
        errors.push(`Facture ${invoice.id}: ${invoiceError.message}`);
      }
    }

    console.log(`✅ Synchronisation terminée: ${updatedCount} facture(s) mise(s) à jour`);

    return new Response(JSON.stringify({
      success: true,
      message: `Synchronisation terminée: ${updatedCount} facture(s) mise(s) à jour`,
      updated: updatedCount,
      total: invoices.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("❌ Erreur synchronisation Billit:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || String(error),
      message: "Erreur lors de la synchronisation"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});