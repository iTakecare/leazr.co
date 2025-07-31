
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } }
    );
    
    // Modèles d'email à initialiser avec design responsive et optimisé
    const templates = [
      {
        type: 'password_reset',
        name: 'Réinitialisation de mot de passe',
        subject: 'Réinitialisation de votre mot de passe',
        html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <img src="{{company_logo}}" alt="iTakecare" style="max-height: 50px; width: auto; margin-bottom: 15px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 300;">Réinitialisation de mot de passe</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding: 40px 30px;">
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Bonjour,<br><br>
                Vous avez demandé la réinitialisation de votre mot de passe. Pour des raisons de sécurité, ce lien expire dans 24 heures.
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{reset_link}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">Réinitialiser mon mot de passe</a>
              </div>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
                <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>Lien de secours :</strong><br>
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                  <span style="word-break: break-all; color: #667eea;">{{reset_link}}</span>
                </p>
              </div>
              <p style="color: #888888; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe restera inchangé.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="color: #888888; font-size: 12px; margin: 0;">
                © 2024 iTakecare. Tous droits réservés.<br>
                Plateforme de gestion de leasing professionnel
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        active: true
      },
      {
        type: 'welcome',
        name: 'Email de bienvenue',
        subject: 'Bienvenue sur iTakecare - Votre plateforme de leasing',
        html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur iTakecare</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <img src="{{company_logo}}" alt="iTakecare" style="max-height: 50px; width: auto; margin-bottom: 15px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 300;">Bienvenue sur iTakecare !</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding: 40px 30px;">
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Bonjour {{user_name}},<br><br>
                Félicitations ! Votre compte iTakecare a été créé avec succès. Vous avez maintenant accès à notre plateforme complète de gestion de leasing.
              </p>
              <div style="background-color: #f0fdf4; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #059669; margin-top: 0; font-size: 18px;">🎉 Votre compte est prêt !</h3>
                <ul style="color: #047857; margin: 15px 0; padding-left: 20px;">
                  <li>Créez et gérez vos offres de leasing</li>
                  <li>Suivez vos contrats en temps réel</li>
                  <li>Accédez aux outils de gestion client</li>
                  <li>Consultez vos rapports et statistiques</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{platform_url}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">Accéder à ma plateforme</a>
              </div>
              <p style="color: #888888; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                Besoin d'aide ? Notre équipe support est disponible à <a href="mailto:support@itakecare.be" style="color: #10b981;">support@itakecare.be</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="color: #888888; font-size: 12px; margin: 0;">
                © 2024 iTakecare. Tous droits réservés.<br>
                Votre partenaire de confiance en leasing professionnel
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        active: true
      },
      {
        type: 'offer_notification',
        name: 'Notification d\'offre de leasing',
        subject: 'Votre offre de leasing personnalisée est prête',
        html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle offre de leasing</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 20px !important; }
      .offer-details { padding: 15px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
              <img src="{{company_logo}}" alt="iTakecare" style="max-height: 50px; width: auto; margin-bottom: 15px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 300;">Votre offre de leasing</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding: 40px 30px;">
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Bonjour {{client_name}},<br><br>
                Excellente nouvelle ! Nous avons préparé une offre de leasing personnalisée qui correspond parfaitement à vos besoins.
              </p>
              <div class="offer-details" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #cbd5e1;">
                <h3 style="color: #1e293b; margin-top: 0; font-size: 20px; text-align: center;">📋 Détails de votre offre</h3>
                <table width="100%" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #475569; font-weight: 600;">💰 Montant total :</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 700; text-align: right;">{{offer_amount}}€</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #475569; font-weight: 600;">📅 Paiement mensuel :</td>
                    <td style="padding: 8px 0; color: #059669; font-weight: 700; text-align: right;">{{monthly_payment}}€/mois</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #475569; font-weight: 600;">🔧 Équipement :</td>
                    <td style="padding: 8px 0; color: #1e293b; text-align: right;">{{equipment_description}}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{offer_url}}" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">Consulter mon offre</a>
              </div>
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                  ⏰ <strong>Offre valide 30 jours</strong> - N'attendez pas pour en profiter !
                </p>
              </div>
              <p style="color: #888888; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                Des questions ? Contactez directement votre conseiller ou notre équipe support.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="color: #888888; font-size: 12px; margin: 0;">
                © 2024 iTakecare. Tous droits réservés.<br>
                Solutions de leasing sur mesure pour votre entreprise
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        active: true
      },
      {
        type: 'contract_signed',
        name: 'Confirmation de signature de contrat',
        subject: '✅ Contrat signé avec succès - Bienvenue chez iTakecare',
        html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat signé avec succès</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 20px !important; }
      .contract-details { padding: 15px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <img src="{{company_logo}}" alt="iTakecare" style="max-height: 50px; width: auto; margin-bottom: 15px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 300;">✅ Contrat validé !</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding: 40px 30px;">
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Bonjour {{client_name}},<br><br>
                Félicitations ! Votre contrat de leasing a été signé électroniquement avec succès le {{signature_date}}. Nous vous remercions de votre confiance.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; border-radius: 50px; margin-bottom: 20px;">
                  <div style="font-size: 48px;">🎉</div>
                </div>
                <h2 style="color: #059669; margin: 0; font-size: 24px;">Contrat activé</h2>
              </div>
              <div class="contract-details" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #047857; margin-top: 0; font-size: 18px; text-align: center;">📄 Récapitulatif du contrat</h3>
                <table width="100%" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">📋 Numéro :</td>
                    <td style="padding: 8px 0; color: #047857; font-weight: 700; text-align: right;">{{contract_number}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">💰 Montant total :</td>
                    <td style="padding: 8px 0; color: #047857; font-weight: 700; text-align: right;">{{contract_amount}}€</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">📅 Durée :</td>
                    <td style="padding: 8px 0; color: #047857; font-weight: 700; text-align: right;">{{contract_duration}} mois</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">✍️ Signé le :</td>
                    <td style="padding: 8px 0; color: #047857; font-weight: 700; text-align: right;">{{signature_date}}</td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                <h4 style="color: #1e40af; margin-top: 0; font-size: 16px;">📬 Prochaines étapes</h4>
                <ul style="color: #1e3a8a; margin: 10px 0; padding-left: 20px; line-height: 1.6;">
                  <li>Vous recevrez une copie PDF du contrat signé</li>
                  <li>Notre équipe vous contactera pour organiser la livraison</li>
                  <li>Votre espace client sera mis à jour avec les détails</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{contract_url}}" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">Consulter mon contrat</a>
              </div>
              <p style="color: #888888; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                Questions ? Contactez votre conseiller ou notre support à <a href="mailto:support@itakecare.be" style="color: #10b981;">support@itakecare.be</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="color: #888888; font-size: 12px; margin: 0;">
                © 2024 iTakecare. Tous droits réservés.<br>
                Merci de votre confiance pour vos solutions de leasing
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        active: true
      },
      {
        type: 'invoice_reminder',
        name: 'Rappel d\'échéance de paiement',
        subject: '⏰ Rappel : Échéance de paiement dans 3 jours',
        html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel échéance de paiement</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 20px !important; }
      .invoice-details { padding: 15px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
              <img src="{{company_logo}}" alt="iTakecare" style="max-height: 50px; width: auto; margin-bottom: 15px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 300;">⏰ Rappel de paiement</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding: 40px 30px;">
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Bonjour {{client_name}},<br><br>
                Nous vous rappelons qu'une échéance de paiement arrive bientôt. Pour éviter tout frais de retard, merci de procéder au règlement avant la date limite.
              </p>
              <div class="invoice-details" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin-top: 0; font-size: 18px; text-align: center;">📄 Facture à régler</h3>
                <table width="100%" style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600;">📋 Numéro :</td>
                    <td style="padding: 8px 0; color: #92400e; font-weight: 700; text-align: right;">{{invoice_number}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600;">💰 Montant :</td>
                    <td style="padding: 8px 0; color: #92400e; font-weight: 700; text-align: right;">{{invoice_amount}}€</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-weight: 600;">📅 Échéance :</td>
                    <td style="padding: 8px 0; color: #dc2626; font-weight: 700; text-align: right;">{{due_date}}</td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
                <p style="color: #dc2626; font-size: 14px; margin: 0; line-height: 1.5;">
                  ⚠️ <strong>Important :</strong> Des frais de retard peuvent s'appliquer après la date d'échéance.
                </p>
              </div>
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{payment_url}}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">Régler maintenant</a>
              </div>
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0ea5e9;">
                <h4 style="color: #0c4a6e; margin-top: 0; font-size: 16px;">💳 Moyens de paiement acceptés</h4>
                <p style="color: #075985; margin: 10px 0; line-height: 1.6;">
                  • Virement bancaire • Prélèvement automatique • Paiement en ligne sécurisé
                </p>
              </div>
              <p style="color: #888888; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                Paiement déjà effectué ? Merci d'ignorer ce message. Pour toute question : <a href="mailto:finance@itakecare.be" style="color: #f59e0b;">finance@itakecare.be</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="color: #888888; font-size: 12px; margin: 0;">
                © 2024 iTakecare. Tous droits réservés.<br>
                Service comptabilité et recouvrement
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        active: true
      }
    ];
    
    console.log(`Tentative d'initialisation de ${templates.length} modèles d'email...`);
    
    // Vérifier quels modèles existent déjà
    let insertedCount = 0;
    let totalCount = 0;
    
    for (const template of templates) {
      // Vérifier si le modèle existe déjà
      const { data: existingTemplate, error: checkError } = await supabaseAdmin
        .from('email_templates')
        .select('id')
        .eq('type', template.type)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {  // PGRST116 = not found
        console.error(`Erreur lors de la vérification du modèle ${template.type}:`, checkError);
        continue;
      }
      
      if (existingTemplate) {
        console.log(`Le modèle ${template.type} existe déjà. Mise à jour...`);
        totalCount++;
        
        // Mettre à jour le modèle existant
        const { error: updateError } = await supabaseAdmin
          .from('email_templates')
          .update({
            name: template.name,
            subject: template.subject,
            html_content: template.html_content,
            active: template.active,
            updated_at: new Date()
          })
          .eq('id', existingTemplate.id);
          
        if (updateError) {
          console.error(`Erreur lors de la mise à jour du modèle ${template.type}:`, updateError);
        } else {
          console.log(`Modèle ${template.type} mis à jour avec succès`);
        }
      } else {
        console.log(`Le modèle ${template.type} n'existe pas. Création...`);
        
        // Créer le nouveau modèle
        const { error: insertError } = await supabaseAdmin
          .from('email_templates')
          .insert({
            type: template.type,
            name: template.name,
            subject: template.subject,
            html_content: template.html_content,
            active: template.active,
            created_at: new Date(),
            updated_at: new Date()
          });
          
        if (insertError) {
          console.error(`Erreur lors de la création du modèle ${template.type}:`, insertError);
        } else {
          console.log(`Modèle ${template.type} créé avec succès`);
          insertedCount++;
          totalCount++;
        }
      }
    }
    
    console.log(`Initialisation des modèles d'email terminée. ${insertedCount} nouveaux modèles ajoutés sur un total de ${totalCount}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        total: totalCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de l'initialisation des modèles d'email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
