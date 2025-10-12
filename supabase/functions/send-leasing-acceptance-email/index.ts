import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  offerId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { offerId }: EmailRequest = await req.json();
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('[LEASING-ACCEPTANCE] Processing acceptance email for offer:', offerId);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch offer details with equipment
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients (
          name,
          email,
          first_name,
          contact_name
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('[LEASING-ACCEPTANCE] Offer not found:', offerError);
      throw new Error('Offer not found');
    }

    // Fetch equipment for this offer
    const { data: equipment, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select('title, quantity')
      .eq('offer_id', offerId);

    if (equipmentError) {
      console.error('[LEASING-ACCEPTANCE] Error fetching equipment:', equipmentError);
    }

    // Build equipment list as bullet points
    let equipmentList = '';
    if (equipment && equipment.length > 0) {
      equipmentList = equipment.map(item => 
        `<li style="margin-bottom: 8px;">${item.quantity}x ${item.title}</li>`
      ).join('');
    } else {
      // Fallback to equipment_description if no equipment items
      equipmentList = `<li>${offer.equipment_description || 'Matériel informatique'}</li>`;
    }

    // Get client name and email
    const clientEmail = offer.clients?.email || offer.client_email;
    const clientFirstName = offer.clients?.first_name || offer.clients?.contact_name || offer.client_name?.split(' ')[0] || 'Client';

    if (!clientEmail) {
      throw new Error('Client email not found');
    }

    console.log('[LEASING-ACCEPTANCE] Sending acceptance email to:', clientEmail);

    // Fetch PDF as base64 for attachment using Supabase Storage (more reliable than public URL)
    const bucket = 'documents';
    const pdfPath = 'modalites_leasing_itakecare.pdf';
    let pdfAttachment = null;

    console.log('[LEASING-ACCEPTANCE] Downloading PDF from storage:', { bucket, pdfPath });

    try {
      const { data: pdfFile, error: pdfDownloadError } = await supabase
        .storage
        .from(bucket)
        .download(pdfPath);

      if (pdfDownloadError) {
        console.error('[LEASING-ACCEPTANCE] Storage download error:', pdfDownloadError);
      } else if (pdfFile) {
        const pdfBuffer = await pdfFile.arrayBuffer();
        console.log('[LEASING-ACCEPTANCE] PDF buffer size (bytes):', pdfBuffer.byteLength);

        const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        console.log('[LEASING-ACCEPTANCE] Base64 PDF length:', base64Pdf.length);

        pdfAttachment = {
          filename: 'modalites_leasing_itakecare.pdf',
          content: base64Pdf,
          contentType: 'application/pdf',
        } as any;
        console.log('[LEASING-ACCEPTANCE] PDF attachment prepared successfully from storage');
      } else {
        console.warn('[LEASING-ACCEPTANCE] No pdfFile returned from storage.download');
      }
    } catch (pdfError) {
      console.error('[LEASING-ACCEPTANCE] Could not prepare PDF attachment - Error:', pdfError);
      console.error('[LEASING-ACCEPTANCE] Error message:', pdfError instanceof Error ? pdfError.message : String(pdfError));
    }

    // HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .equipment-list {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .equipment-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .celebration {
      text-align: center;
      font-size: 48px;
      margin: 20px 0;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .warning-title {
      font-weight: bold;
      color: #92400e;
      margin-bottom: 5px;
    }
    .divider {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🙌 Félicitations - Votre demande de leasing a été acceptée !</h1>
  </div>
  
  <div class="content">
    <p>Bonjour <strong>${clientFirstName}</strong>,</p>
    
    <p>Ce mail de confirmation pour vous annoncer que votre demande de leasing informatique concernant :</p>
    
    <div class="equipment-list">
      <ul>
        ${equipmentList}
      </ul>
    </div>
    
    <div class="celebration">A ÉTÉ ACCEPTÉE 🎉</div>
    
    <hr class="divider">
    
    <p><strong>Prochaines étapes :</strong></p>
    
    <p>Dans quelques instants, vous allez recevoir le contrat de notre partenaire financier à signer de manière électronique.</p>
    
    <p>Dès réception de la signature du contrat, nous procéderons à la commande de matériel et nous vous contacterons pour définir une date de livraison (comptez 3 à 4 jours ouvrables pour la réception du matériel).</p>
    
    <div class="warning">
      <div class="warning-title">⚠️ Actions requises :</div>
      <p style="margin: 5px 0;">• Pouvez-vous nous envoyer la copie ou une photo lisible recto/verso de votre carte d'identité par retour de mail.</p>
      <p style="margin: 5px 0;">• Pouvez-vous également prendre connaissance des modalités de leasing ci-jointes, cela évitera tout malentendus.</p>
    </div>
    
    <p>N'hésitez pas à revenir vers nous si vous avez la moindre question.</p>
    
    <p>Bonne journée,</p>
    
    <p><strong>Cordialement,</strong><br>
    L'équipe iTakecare</p>
  </div>
  
  <div class="footer">
    <p>iTakecare SRL | BE0795.642.894<br>
    Avenue Général Michel 1E - 6000 Charleroi<br>
    <a href="https://www.itakecare.be">www.itakecare.be</a> | <a href="mailto:hello@itakecare.be">hello@itakecare.be</a></p>
  </div>
</body>
</html>
    `;

    // Plain text version
    const textContent = `
Bonjour ${clientFirstName},

Ce mail de confirmation pour vous annoncer que votre demande de leasing informatique concernant :

${equipment?.map(item => `• ${item.quantity}x ${item.title}`).join('\n') || `• ${offer.equipment_description || 'Matériel informatique'}`}

A ÉTÉ ACCEPTÉE 🎉

-----

Dans quelques instants, vous allez recevoir le contrat de notre partenaire financier à signer de manière électronique.

Dès réception de la signature du contrat, nous procéderons à la commande de matériel et nous vous contacterons pour définir une date de livraison (comptez 3 à 4 jours ouvrables pour la réception du matériel).

⚠️ Actions requises :
• Pouvez-vous nous envoyer la copie ou une photo lisible recto/verso de votre carte d'identité par retour de mail.
• Pouvez-vous également prendre connaissance des modalités de leasing ci-jointes, cela évitera tout malentendus.

N'hésitez pas à revenir vers nous si vous avez la moindre question.

Bonne journée,

Cordialement,
L'équipe iTakecare

iTakecare SRL | BE0795.642.894
Avenue Général Michel 1E - 6000 Charleroi
www.itakecare.be | hello@itakecare.be
    `;

    // Send email via Resend
    const emailPayload: any = {
      from: 'iTakecare <noreply@itakecare.be>',
      to: [clientEmail],
      subject: '🙌 Félicitations - Votre demande de leasing a été acceptée !',
      html: htmlContent,
      text: textContent,
    };

    // Add attachment if available
    console.log('[LEASING-ACCEPTANCE] PDF attachment available:', !!pdfAttachment);
    if (pdfAttachment) {
      emailPayload.attachments = [pdfAttachment];
      console.log('[LEASING-ACCEPTANCE] PDF attachment added to email payload');
      console.log('[LEASING-ACCEPTANCE] Attachment filename:', pdfAttachment.filename);
      console.log('[LEASING-ACCEPTANCE] Attachment content length:', pdfAttachment.content?.length || 0);
    } else {
      console.warn('[LEASING-ACCEPTANCE] No PDF attachment - email will be sent without it');
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('[LEASING-ACCEPTANCE] Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();
    console.log('[LEASING-ACCEPTANCE] Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[LEASING-ACCEPTANCE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
