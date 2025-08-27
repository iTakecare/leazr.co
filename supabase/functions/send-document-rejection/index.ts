import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("===== NOUVELLE REQUÊTE DOCUMENT REJECTION =====")
    
    if (!RESEND_API_KEY) {
      console.error("❌ Clé API Resend manquante")
      throw new Error('ITAKECARE_RESEND_API is not set')
    }

    const { 
      clientEmail, 
      clientName, 
      documentType, 
      rejectionReason, 
      uploadLink,
      companyName = 'iTakecare'
    } = await req.json()

    console.log("📧 Envoi d'email de rejet à:", clientEmail)
    console.log("📄 Document rejeté:", documentType)
    console.log("📝 Raison:", rejectionReason)

    // Préparer le contenu de l'email
    const subject = `Document rejeté - ${companyName}`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background-color: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
            .rejection-reason { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .upload-button { 
              display: inline-block; 
              background-color: #007bff; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Document rejeté</h2>
              <p>Bonjour ${clientName},</p>
            </div>
            
            <div class="content">
              <p>Nous avons examiné votre document <strong>${documentType}</strong> et malheureusement, nous ne pouvons pas l'accepter en l'état.</p>
              
              <div class="rejection-reason">
                <h4>📋 Raison du rejet :</h4>
                <p>${rejectionReason}</p>
              </div>
              
              <p>Pas d'inquiétude ! Vous pouvez télécharger une version corrigée de ce document en utilisant le lien ci-dessous :</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${uploadLink}" class="upload-button">
                  📄 Télécharger le document corrigé
                </a>
              </div>
              
              <p><strong>Instructions :</strong></p>
              <ul>
                <li>Corrigez les éléments mentionnés dans la raison du rejet</li>
                <li>Utilisez le lien ci-dessus pour télécharger votre document corrigé</li>
                <li>Une fois téléchargé, votre document sera automatiquement soumis pour révision</li>
              </ul>
              
              <p>Si vous avez des questions concernant ce rejet, n'hésitez pas à nous contacter.</p>
            </div>
            
            <div class="footer">
              <p>Cordialement,<br>L'équipe ${companyName}</p>
              <p><small>Cet email a été envoyé automatiquement. Merci de ne pas répondre à cette adresse.</small></p>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `
Bonjour ${clientName},

Nous avons examiné votre document "${documentType}" et malheureusement, nous ne pouvons pas l'accepter en l'état.

Raison du rejet :
${rejectionReason}

Pas d'inquiétude ! Vous pouvez télécharger une version corrigée en utilisant ce lien :
${uploadLink}

Instructions :
- Corrigez les éléments mentionnés dans la raison du rejet
- Utilisez le lien pour télécharger votre document corrigé
- Une fois téléchargé, votre document sera automatiquement soumis pour révision

Si vous avez des questions, n'hésitez pas à nous contacter.

Cordialement,
L'équipe ${companyName}
    `

    // Envoyer l'email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@itakecare.be>`,
        to: [clientEmail],
        subject,
        text: textContent,
        html: htmlContent,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error("❌ Erreur Resend:", error)
      throw new Error(`Failed to send email: ${error}`)
    }

    const data = await res.json()
    console.log("✅ Email de rejet envoyé avec succès:", data.id)

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: data.id,
      message: "Email de rejet envoyé avec succès" 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de rejet:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  }
})