// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno&dts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('send-welcome-followup-email v1');

  try {
    if (!RESEND_API_KEY) {
      throw new Error('ITAKECARE_RESEND_API non configurée');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Chercher les contrats livrés depuis 7+ jours sans email de suivi envoyé
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select('id, client_name, client_email, client_company, leaser_name, company_id, contract_number')
      .is('welcome_followup_sent_at', null)
      .lte('delivery_date', sevenDaysAgoStr)
      .in('delivery_status', ['livre', 'delivered'])
      .not('client_email', 'is', null);

    if (fetchError) {
      console.error('❌ Erreur récupération contrats:', fetchError);
      throw new Error('Erreur lors de la récupération des contrats');
    }

    if (!contracts || contracts.length === 0) {
      console.log('ℹ️ Aucun contrat éligible pour l\'email de bienvenue');
      return new Response(
        JSON.stringify({ success: true, message: 'Aucun contrat éligible', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 ${contracts.length} contrat(s) éligible(s) pour l'email de bienvenue`);

    let sentCount = 0;
    let errorCount = 0;

    for (const contract of contracts) {
      try {
        // Récupérer le branding de la company
        let companyName = "Notre équipe";
        let primaryColor = "#3b82f6";
        let logoUrl = "";
        let trustpilotUrl = "";
        let googleReviewUrl = "";

        if (contract.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name, logo_url, primary_color')
            .eq('id', contract.company_id)
            .single();

          if (company) {
            companyName = company.name || companyName;
            primaryColor = company.primary_color || primaryColor;
            logoUrl = company.logo_url || "";
          }

          // Récupérer les liens de review depuis company_customizations ou settings
          const { data: customizations } = await supabase
            .from('company_customizations')
            .select('*')
            .eq('company_id', contract.company_id)
            .single();

          // Les liens Trustpilot et Google peuvent être stockés en secrets ou en dur pour l'instant
          trustpilotUrl = Deno.env.get('TRUSTPILOT_REVIEW_URL') || 'https://www.trustpilot.com/review/itakecare.be';
          googleReviewUrl = Deno.env.get('GOOGLE_REVIEW_URL') || 'https://g.page/r/itakecare/review';
        }

        const clientName = contract.client_name || 'Client';

        const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 30px 40px; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 50px; max-width: 200px;" />` : `<h1 style="margin: 0; color: #ffffff; font-size: 24px;">${companyName}</h1>`}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">👋 Bonjour ${clientName},</h2>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                Cela fait maintenant une semaine que votre matériel a été livré et nous espérons que tout se passe bien !
              </p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                Nous souhaitions simplement prendre de vos nouvelles et nous assurer que vous êtes pleinement satisfait(e) de votre équipement. Si vous avez la moindre question ou si quelque chose ne fonctionne pas comme prévu, n'hésitez surtout pas à nous contacter. Nous sommes là pour vous aider !
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                Votre avis compte beaucoup pour nous. Si vous êtes satisfait(e) de nos services, nous serions ravis que vous partagiez votre expérience :
              </p>

              <!-- Review Buttons -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${trustpilotUrl}" style="display: inline-block; background-color: #00b67a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 0 8px 12px 8px;">
                  ⭐ Avis sur Trustpilot
                </a>
                <br style="display: block; content: ''; margin-top: 8px;" />
                <a href="${googleReviewUrl}" style="display: inline-block; background-color: #4285f4; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 0 8px 12px 8px;">
                  ⭐ Avis sur Google
                </a>
              </div>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 24px 0 0 0;">
                Merci pour votre confiance et à très bientôt !
              </p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0 0 0;">
                Cordialement,<br/>
                <strong>L'équipe ${companyName}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                ${contract.contract_number ? `Contrat : ${contract.contract_number}<br>` : ''}
                Cet email a été envoyé par ${companyName}.<br>
                © ${new Date().getFullYear()} ${companyName}. Tous droits réservés.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${companyName} <noreply@itakecare.be>`,
            to: [contract.client_email],
            subject: `👋 Comment se passe votre nouvelle installation ?`,
            html: htmlContent,
          }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error(`❌ Erreur Resend pour contrat ${contract.id}:`, resendData);
          errorCount++;
          continue;
        }

        // Marquer comme envoyé
        await supabase
          .from('contracts')
          .update({ welcome_followup_sent_at: new Date().toISOString() })
          .eq('id', contract.id);

        console.log(`✅ Email envoyé pour contrat ${contract.id} (${contract.client_email})`);
        sentCount++;

      } catch (emailError) {
        console.error(`❌ Erreur pour contrat ${contract.id}:`, emailError);
        errorCount++;
      }
    }

    console.log(`📊 Résultat: ${sentCount} envoyé(s), ${errorCount} erreur(s)`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errorCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur dans send-welcome-followup-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

Deno.serve(handler);
