import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getAppUrl, getFromEmail, getFromName } from "../_shared/url-utils.ts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offerId } = await req.json();

    console.log('📧 [NOTIFY-DOCUMENTS] Début notification pour offre:', offerId);

    if (!offerId) {
      throw new Error('offerId is required');
    }

    if (!RESEND_API_KEY) {
      console.error('❌ ITAKECARE_RESEND_API not configured');
      throw new Error('ITAKECARE_RESEND_API not configured');
    }

    // Initialiser le client Supabase avec service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Récupérer les documents NON notifiés pour cette offre
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('offer_documents')
      .select('id, document_type, file_name, uploaded_at, uploaded_by')
      .eq('offer_id', offerId)
      .is('notified_at', null)
      .order('uploaded_at', { ascending: true });

    if (docsError) {
      console.error('❌ Erreur récupération documents:', docsError);
      throw new Error('Failed to fetch documents');
    }

    if (!documents || documents.length === 0) {
      console.log('ℹ️ Aucun document à notifier pour cette offre');
      return new Response(
        JSON.stringify({ success: true, message: 'No documents to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 ${documents.length} document(s) à notifier`);

    // 2. Récupérer les infos de l'offre avec le commercial et la company
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('offers')
      .select(`
        id,
        client_name,
        client_email,
        user_id,
        company_id,
        companies (
          name,
          slug
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('❌ Erreur récupération offre:', offerError);
      throw new Error('Offer not found');
    }

    console.log('✓ Offre récupérée:', { 
      clientName: offer.client_name, 
      companySlug: offer.companies?.slug,
      userId: offer.user_id 
    });

    // 3. Récupérer les emails des admins via la fonction RPC
    const { data: adminEmails, error: adminsError } = await supabaseAdmin
      .rpc('get_admin_emails_for_company', { company_id_param: offer.company_id });

    const adminList: string[] = adminsError ? [] : (adminEmails || []);
    console.log(`✓ ${adminList.length} admin(s) trouvé(s)`);

    // 4. Récupérer l'email du commercial (user_id de l'offre)
    let commercialEmail: string | null = null;
    if (offer.user_id) {
      const { data: commercialProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', offer.user_id)
        .single();

      if (!profileError && commercialProfile?.email) {
        commercialEmail = commercialProfile.email;
        console.log(`✓ Commercial trouvé: ${commercialEmail}`);
      }
    }

    // 5. Fusionner les destinataires (sans doublons)
    const allRecipients = new Set<string>();
    adminList.forEach(email => allRecipients.add(email));
    if (commercialEmail) {
      allRecipients.add(commercialEmail);
    }

    if (allRecipients.size === 0) {
      console.log('⚠️ Aucun destinataire trouvé');
      // Créer une notification in-app quand même
      await createInAppNotification(supabaseAdmin, offer.company_id, offerId, documents.length, offer.client_name);
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients, in-app notification created' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Envoi à ${allRecipients.size} destinataire(s):`, Array.from(allRecipients));

    // 6. Générer l'URL vers l'offre
    const appUrl = getAppUrl(req);
    const companySlug = offer.companies?.slug || 'admin';
    const offerUrl = `${appUrl}/${companySlug}/admin/offers/${offerId}`;
    console.log('🔗 URL de l\'offre:', offerUrl);

    // 7. Générer l'email HTML
    const documentTypeLabels: Record<string, string> = {
      balance_sheet: "Bilan financier",
      tax_notice: "Avertissement extrait de rôle",
      id_card_front: "Carte d'identité - Recto",
      id_card_back: "Carte d'identité - Verso",
      id_card: "Carte d'identité",
      company_register: "Extrait de registre d'entreprise",
      vat_certificate: "Attestation TVA",
      bank_statement: "Relevé bancaire",
      provisional_balance: "Bilan financier provisoire",
      tax_return: "Liasse fiscale",
      custom: "Autre document",
      other: "Autre document",
      additional_id: "Pièce d'identité supplémentaire",
      proof_of_address: "Justificatif de domicile",
      company_statutes: "Statuts de l'entreprise",
      bank_statement_additional: "Relevé bancaire supplémentaire",
      other_financial: "Autre document financier",
      quote: "Devis",
      contract: "Contrat",
      insurance: "Attestation d'assurance"
    };

    const getDocumentLabel = (docType: string): string => {
      // Handle "additional:" prefix
      if (docType.startsWith('additional:')) {
        const baseType = docType.replace('additional:', '');
        return documentTypeLabels[baseType] || baseType;
      }
      return documentTypeLabels[docType] || docType;
    };

    const documentsList = documents.map(doc => {
      const label = getDocumentLabel(doc.document_type);
      return `<li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        <strong>${label}</strong><br/>
        <span style="color: #6b7280; font-size: 14px;">${doc.file_name}</span>
      </li>`;
    }).join('');

    const uploaderEmail = documents[0]?.uploaded_by || 'Non spécifié';
    const companyName = offer.companies?.name || 'Votre entreprise';
    const fromEmail = getFromEmail();
    const fromName = getFromName({ from_name: companyName });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background-color: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .info-box strong { color: #1e40af; }
    .documents-list { list-style: none; padding: 0; margin: 0; }
    .button { display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background-color: #2563eb; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .badge { display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 ${documents.length} nouveau${documents.length > 1 ? 'x' : ''} document${documents.length > 1 ? 's' : ''} reçu${documents.length > 1 ? 's' : ''}</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <p>De nouveaux documents ont été uploadés pour le dossier suivant :</p>
      
      <div class="info-box">
        <strong>Client :</strong> ${offer.client_name || 'Non spécifié'}<br/>
        <strong>Nombre de documents :</strong> <span class="badge">${documents.length}</span><br/>
        <strong>Uploadé par :</strong> ${uploaderEmail}
      </div>
      
      <h3 style="color: #1e40af; margin-top: 25px;">Documents reçus :</h3>
      <ul class="documents-list">
        ${documentsList}
      </ul>
      
      <p style="margin-top: 25px;">Ces documents sont en attente de validation.</p>
      
      <div style="text-align: center;">
        <a href="${offerUrl}" class="button">Voir le dossier et valider</a>
      </div>
      
      <p>Cordialement,<br/>L'équipe ${companyName}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;

    // 8. Envoyer l'email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: Array.from(allRecipients),
        subject: `📄 ${documents.length} nouveau${documents.length > 1 ? 'x' : ''} document${documents.length > 1 ? 's' : ''} reçu${documents.length > 1 ? 's' : ''} - ${offer.client_name || 'Client'}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ Erreur envoi email Resend:', errorText);
      // On continue pour créer la notification in-app même si l'email échoue
    } else {
      const emailResult = await emailResponse.json();
      console.log('✅ Email envoyé avec succès:', emailResult);
    }

    // 9. Marquer les documents comme notifiés
    const documentIds = documents.map(d => d.id);
    const { error: updateError } = await supabaseAdmin
      .from('offer_documents')
      .update({ notified_at: new Date().toISOString() })
      .in('id', documentIds);

    if (updateError) {
      console.error('⚠️ Erreur mise à jour notified_at:', updateError);
    } else {
      console.log(`✓ ${documentIds.length} document(s) marqués comme notifiés`);
    }

    // 10. Créer une notification in-app
    await createInAppNotification(supabaseAdmin, offer.company_id, offerId, documents.length, offer.client_name);

    console.log('✅ [NOTIFY-DOCUMENTS] Processus terminé avec succès');

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentsNotified: documents.length,
        recipientsCount: allRecipients.size
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ [NOTIFY-DOCUMENTS] Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Fonction helper pour créer une notification in-app
async function createInAppNotification(
  supabaseAdmin: any,
  companyId: string,
  offerId: string,
  documentCount: number,
  clientName: string | null
) {
  try {
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .insert({
        company_id: companyId,
        offer_id: offerId,
        type: 'document_upload',
        title: `${documentCount} nouveau${documentCount > 1 ? 'x' : ''} document${documentCount > 1 ? 's' : ''} reçu${documentCount > 1 ? 's' : ''}`,
        message: `Le client ${clientName || 'inconnu'} a uploadé ${documentCount} document${documentCount > 1 ? 's' : ''} sur son dossier.`,
        metadata: { documentCount, clientName }
      });

    if (error) {
      console.error('⚠️ Erreur création notification in-app:', error);
    } else {
      console.log('✓ Notification in-app créée');
    }
  } catch (error) {
    console.error('⚠️ Erreur création notification in-app:', error);
  }
}
