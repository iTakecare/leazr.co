import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialEmailRequest {
  type: 'confirmation' | 'welcome';
  companyName: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  companyId?: string;
  confirmationToken?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, companyName, adminEmail, adminFirstName, adminLastName, companyId, confirmationToken }: TrialEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${adminEmail} for company ${companyName}`);

    // Récupérer les paramètres SMTP depuis la base de données
    const { data: smtpSettings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name')
      .eq('id', 1)
      .single();
    
    if (settingsError) {
      console.error("Erreur lors de la récupération des paramètres SMTP:", settingsError);
      throw new Error(`Erreur de base de données: ${settingsError.message}`);
    }
    
    if (!smtpSettings || !smtpSettings.resend_api_key) {
      console.error("Clé API Resend non configurée dans la base de données");
      throw new Error("Clé API Resend non configurée");
    }

    console.log("Clé API Resend récupérée avec succès");
    
    // Vérifier si la clé API n'est pas vide et ne contient pas de placeholder
    const apiKey = smtpSettings.resend_api_key.trim();
    if (apiKey === "" || apiKey.includes("YOUR_API_KEY") || apiKey.includes("RESEND_API_KEY")) {
      console.error("Clé API Resend invalide ou non configurée correctement");
      throw new Error("Clé API Resend invalide");
    }
    
    const resend = new Resend(apiKey);

    // Format d'expéditeur 
    const fromName = smtpSettings.from_name || "Leazr";
    const fromEmail = smtpSettings.from_email || "noreply@leazr.co";
    const from = `${fromName} <${fromEmail}>`;

    if (type === 'confirmation') {
      // Generate confirmation token if not provided
      const token = confirmationToken || crypto.randomUUID();
      
      if (companyId) {
        // Store confirmation token in database
        const { error: tokenError } = await supabase
          .from('company_email_confirmations')
          .insert({
            company_id: companyId,
            token: token,
            email: adminEmail
          });

        if (tokenError) {
          console.error('Error storing confirmation token:', tokenError);
          throw new Error('Failed to store confirmation token');
        }
      }

      const confirmationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/v1', '')}/trial/activate/${token}`;

      const emailResponse = await resend.emails.send({
        from: from,
        to: [adminEmail],
        subject: "Confirmez votre inscription à Leazr - Essai gratuit 14 jours",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; }
              .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px 20px; text-align: center; }
              .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .header-text { color: white; font-size: 16px; opacity: 0.9; }
              .content { padding: 40px 20px; }
              .title { font-size: 24px; color: #1e293b; margin-bottom: 20px; }
              .text { color: #475569; line-height: 1.6; margin-bottom: 20px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .features { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .feature-item { display: flex; align-items: center; margin-bottom: 10px; }
              .checkmark { color: #10b981; margin-right: 10px; font-weight: bold; }
              .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Leazr</div>
                <div class="header-text">Plateforme SaaS pour piloter votre activité de leasing</div>
              </div>
              
              <div class="content">
                <h1 class="title">Bienvenue ${adminFirstName} !</h1>
                
                <p class="text">
                  Merci d'avoir choisi Leazr pour gérer votre activité de leasing. Votre inscription pour 
                  <strong>${companyName}</strong> est presque terminée.
                </p>
                
                <p class="text">
                  Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre 
                  <strong>essai gratuit de 14 jours</strong> :
                </p>
                
                <div style="text-align: center;">
                  <a href="${confirmationUrl}" class="cta-button">
                    Confirmer mon inscription
                  </a>
                </div>
                
                <div class="features">
                  <h3 style="margin-top: 0; color: #1e293b;">Ce qui vous attend avec Leazr :</h3>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    <span>CRM spécialisé pour le leasing</span>
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    <span>Calculs automatisés de commissions</span>
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    <span>Gestion complète des contrats</span>
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    <span>Catalogue produits intégré</span>
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    <span>Support client dédié</span>
                  </div>
                </div>
                
                <p class="text">
                  <strong>Attention :</strong> Ce lien expirera dans 24 heures. Si vous rencontrez des difficultés, 
                  contactez notre équipe support.
                </p>
              </div>
              
              <div class="footer">
                <p>Leazr - Plateforme SaaS pour le leasing</p>
                <p>Cet email a été envoyé à ${adminEmail}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Confirmation email sent successfully:", emailResponse);
      return new Response(JSON.stringify({ success: true, message: "Confirmation email sent" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (type === 'welcome') {
      const loginUrl = 'https://preview--leazr.lovable.app/dashboard';

      const emailResponse = await resend.emails.send({
        from: from,
        to: [adminEmail],
        subject: "🎉 Votre essai Leazr est maintenant actif !",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; }
              .header { background: linear-gradient(135deg, #10b981, #3b82f6); padding: 40px 20px; text-align: center; }
              .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .header-text { color: white; font-size: 16px; opacity: 0.9; }
              .content { padding: 40px 20px; }
              .title { font-size: 24px; color: #1e293b; margin-bottom: 20px; }
              .text { color: #475569; line-height: 1.6; margin-bottom: 20px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .credentials-box { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
              .next-steps { background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .step { display: flex; align-items: center; margin-bottom: 10px; }
              .step-number { background-color: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 12px; font-weight: bold; }
              .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🎉 Leazr</div>
                <div class="header-text">Votre essai gratuit est maintenant actif !</div>
              </div>
              
              <div class="content">
                <h1 class="title">Félicitations ${adminFirstName} !</h1>
                
                <p class="text">
                  Votre compte <strong>${companyName}</strong> est maintenant activé ! Vous avez accès à 
                  <strong>14 jours d'essai gratuit</strong> pour découvrir toutes les fonctionnalités de Leazr.
                </p>
                
                <div class="credentials-box">
                  <h3 style="margin-top: 0; color: #1e293b;">Vos identifiants de connexion :</h3>
                  <p><strong>Email :</strong> ${adminEmail}</p>
                  <p><strong>Mot de passe :</strong> Celui que vous avez défini lors de l'inscription</p>
                </div>
                
                 <div style="text-align: center;">
                   <a href="${loginUrl}" class="cta-button">
                     Accéder à mon tableau de bord
                   </a>
                 </div>
                
                <div class="next-steps">
                  <h3 style="margin-top: 0; color: #065f46;">Vos prochaines étapes :</h3>
                  <div class="step">
                    <span class="step-number">1</span>
                    <span>Connectez-vous et explorez le tableau de bord</span>
                  </div>
                  <div class="step">
                    <span class="step-number">2</span>
                    <span>Ajoutez vos premiers clients et ambassadeurs</span>
                  </div>
                  <div class="step">
                    <span class="step-number">3</span>
                    <span>Créez votre première offre de leasing</span>
                  </div>
                  <div class="step">
                    <span class="step-number">4</span>
                    <span>Configurez votre catalogue produits</span>
                  </div>
                </div>
                
                <p class="text">
                  <strong>Besoin d'aide ?</strong> Notre équipe support est là pour vous accompagner dans 
                  vos premiers pas. N'hésitez pas à nous contacter !
                </p>
                
                <p class="text" style="font-size: 14px; color: #64748b;">
                  Votre période d'essai se termine le <strong>${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</strong>. 
                  Vous recevrez des notifications avant l'expiration.
                </p>
              </div>
              
              <div class="footer">
                <p>Leazr - Plateforme SaaS pour le leasing</p>
                <p>Cet email a été envoyé à ${adminEmail}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Welcome email sent successfully:", emailResponse);
      return new Response(JSON.stringify({ success: true, message: "Welcome email sent" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid email type" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-trial-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);