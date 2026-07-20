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
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: {
        endpoint: "billit-sync-status",
        maxRequests: 15,
        windowSeconds: 60,
        identifierPrefix: "billit-sync-status",
      },
    });

    if (!access.ok) {
      return access.response;
    }

    let payload: SyncRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { companyId, invoiceId } = payload;
    console.log("🔄 Début synchronisation Billit statuts - companyId:", companyId, "invoiceId:", invoiceId);

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
    
    // Corriger l'URL de base si nécessaire (my.billit.be -> api.billit.be)
    let apiBaseUrl = credentials.baseUrl;
    if (apiBaseUrl.includes('my.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.billit.be', 'api.billit.be');
    }
    if (apiBaseUrl.includes('my.sandbox.billit.be')) {
      apiBaseUrl = apiBaseUrl.replace('my.sandbox.billit.be', 'api.sandbox.billit.be');
    }
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '');

    // Construire la requête pour récupérer les factures à synchroniser
    let invoicesQuery = supabase
      .from('invoices')
      .select('id, external_invoice_id, status, sent_at, paid_at, due_date')
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

        // Construire les headers - ContextPartyID seulement si explicitement configuré
        const billitHeaders: Record<string, string> = {
          'ApiKey': credentials.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        // Ajouter ContextPartyID seulement si présent et non vide
        if (credentials.companyId && credentials.companyId.trim() !== '') {
          billitHeaders['ContextPartyID'] = credentials.companyId;
        }

        // Récupérer les détails depuis Billit
        const detailsResponse = await fetch(`${apiBaseUrl}/v1/orders/${invoice.external_invoice_id}`, {
          method: 'GET',
          headers: billitHeaders
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

        // Comptabilisée dans Billit (statut != Draft) = due, même si pas envoyée via Billit
        const isBooked = billitDetails.IsSent ||
          (billitDetails.OrderStatus && billitDetails.OrderStatus !== 'Draft');

        if (billitDetails.Paid && invoice.status !== 'paid') {
          newStatus = 'paid';
          newPaidAt = new Date().toISOString();
          if (!newSentAt) {
            newSentAt = new Date().toISOString();
          }
        } else if (isBooked && ['created', 'draft'].includes(invoice.status)) {
          newStatus = 'sent';
          newSentAt = new Date().toISOString();
        }

        // Échéance : Billit fait foi
        let newDueDate = invoice.due_date;
        if (billitDetails.ExpiryDate) {
          const t = new Date(billitDetails.ExpiryDate).getTime();
          if (!isNaN(t)) newDueDate = new Date(t).toISOString().slice(0, 10);
        }

        // Récupérer l'URL du PDF si disponible
        if (billitDetails.OrderPDF && billitDetails.OrderPDF.FileID) {
          newPdfUrl = `${apiBaseUrl}/v1/files/${billitDetails.OrderPDF.FileID}`;
        }

        // Mettre à jour la facture si des changements sont détectés
        if (newStatus !== invoice.status || newSentAt !== invoice.sent_at || newPaidAt !== invoice.paid_at || newDueDate !== invoice.due_date || newPdfUrl) {
          const updateData: any = {
            status: newStatus,
            sent_at: newSentAt,
            paid_at: newPaidAt,
            due_date: newDueDate,
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
        errors.push(`Facture ${invoice.id}: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
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
      error: error instanceof Error ? error.message : String(error),
      message: "Erreur lors de la synchronisation"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
