import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAccountRequest {
  email: string;
  entityType: 'partner' | 'ambassador' | 'client';
  entityId: string;
  companyId: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

// Force redéploiement - Fix getUserByEmail error 
const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase avec la clé de service pour accès admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, entityType, entityId, companyId, firstName, lastName, role }: CreateAccountRequest = await req.json();

    console.log(`Création d'un compte pour ${email} (${entityType})`);

    // 1. Vérifier si l'utilisateur existe déjà via la table profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .single();
    
    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'Un utilisateur avec cet email existe déjà' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2. Créer l'utilisateur avec un mot de passe temporaire (il devra le changer)
    const tempPassword = crypto.randomUUID();
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // Pas de confirmation automatique
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
        role: role || entityType,
        entity_type: entityType,
        entity_id: entityId,
        company_id: companyId
      }
    });

    if (userError || !userData.user) {
      console.error('Erreur création utilisateur:', userError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de l\'utilisateur' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 3. Créer le profil dans public.profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.user.id,
        first_name: firstName || '',
        last_name: lastName || '',
        role: role || entityType,
        company_id: companyId
      });

    if (profileError) {
      console.error('Erreur création profil:', profileError);
      // Supprimer l'utilisateur créé si le profil échoue
      await supabase.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du profil' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 4. Mettre à jour l'entité avec user_id et has_user_account
    const tableMap = {
      'partner': 'partners',
      'ambassador': 'ambassadors', 
      'client': 'clients'
    };

    const { error: updateError } = await supabase
      .from(tableMap[entityType])
      .update({
        user_id: userData.user.id,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', entityId);

    if (updateError) {
      console.error('Erreur mise à jour entité:', updateError);
    }

    // 5. Générer un token personnalisé pour l'activation
    const activationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    const { error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .insert({
        user_email: email,
        token: activationToken,
        token_type: 'invitation',
        company_id: companyId, // Colonne obligatoire dans la table
        expires_at: expiresAt.toISOString(),
        metadata: {
          user_id: userData.user.id,
          first_name: firstName,
          last_name: lastName,
          entity_type: entityType,
          entity_id: entityId
        }
      });

    if (tokenError) {
      console.error('Erreur création token:', tokenError);
    }

    // 6. Récupérer les informations de l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', companyId)
      .single();

    // 7. Récupérer les paramètres SMTP/Email de l'entreprise
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();

    // Déterminer quelle clé API Resend utiliser
    let resendApiKey = Deno.env.get("LEAZR_RESEND_API");
    let fromEmail = 'noreply@leazr.co';
    let fromName = 'Leazr';

    // Traitement spécial pour iTakecare - utiliser ITAKECARE_RESEND_API
    if (companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0') {
      console.log('Utilisation de la clé API Resend spéciale iTakecare (ITAKECARE_RESEND_API)');
      resendApiKey = Deno.env.get("ITAKECARE_RESEND_API");
      console.log('Clé API iTakecare (masquée):', resendApiKey ? resendApiKey.substring(0, 8) + '...' : 'non définie');
      fromEmail = 'noreply@itakecare.be';
      fromName = 'iTakecare';
    } else if (smtpSettings && smtpSettings.resend_api_key && smtpSettings.resend_api_key.trim() !== '') {
      console.log('Utilisation de la clé API Resend de l\'entreprise');
      console.log('Clé API entreprise (masquée):', smtpSettings.resend_api_key.substring(0, 8) + '...');
      resendApiKey = smtpSettings.resend_api_key.trim(); // Nettoyer les espaces
      fromEmail = smtpSettings.from_email || fromEmail;
      fromName = smtpSettings.from_name || fromName;
    } else {
      console.log('Utilisation de la clé API Resend de fallback (LEAZR_RESEND_API)');
      console.log('Clé API fallback (masquée):', resendApiKey ? resendApiKey.substring(0, 8) + '...' : 'non définie');
    }

    if (!resendApiKey) {
      console.error('Aucune clé API Resend disponible');
      return new Response(
        JSON.stringify({ error: 'Configuration API Resend manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    // 8. Récupérer le template d'email approprié selon le type d'entité
    const templateType = entityType === 'ambassador' ? 'ambassador_account' : 
                        entityType === 'partner' ? 'partner_account' : 
                        'client_account';
    
    console.log(`Recherche du template: ${templateType} pour l'entreprise ${companyId}`);
    
    const { data: emailTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', templateType)
      .eq('active', true)
      .single();

    if (emailTemplate) {
      console.log(`Template ${templateType} trouvé et utilisé`);
    } else {
      console.log(`Aucun template ${templateType} trouvé, utilisation du template par défaut`);
    }

    // 9. Préparer le contenu de l'email
    const APP_URL = Deno.env.get('APP_URL') || 'https://preview--leazr.lovable.app';
    const encodedToken = encodeURIComponent(activationToken);
    const encodedType = encodeURIComponent('invitation');
    const activationUrl = `${APP_URL}/update-password?token=${encodedToken}&type=${encodedType}`;
    
    console.log('URL d\'activation générée:', activationUrl);
    console.log('Token brut:', activationToken);
    
    const entityNames = {
      'partner': 'partenaire',
      'ambassador': 'ambassadeur',
      'client': 'client'
    };

    let emailContent;
    let emailSubject;

    if (emailTemplate) {
      // Utiliser le template personnalisé et traiter les conditions Handlebars
      emailContent = emailTemplate.html_content;
      emailSubject = emailTemplate.subject;
      
      // Traiter les conditions {{#if company_logo}} dans le template
      const hasLogo = company?.logo_url && company.logo_url.trim() !== '';
      
      // Remplacer les conditions Handlebars par le contenu approprié
      emailContent = emailContent.replace(
        /{{#if\s+company_logo}}([\s\S]*?){{\/if}}/g,
        hasLogo ? '$1' : ''
      );
      
      // Remplacer les variables dans le template personnalisé
      emailContent = emailContent
        .replace(/{{user_name}}/g, `${firstName || ''} ${lastName || ''}`.trim())
        .replace(/{{activation_url}}/g, activationUrl)
        .replace(/{{company_name}}/g, company?.name || '')
        .replace(/{{company_logo}}/g, company?.logo_url || '')
        .replace(/{{company_address}}/g, emailTemplate.company_address || '');
    } else {
      // Template par défaut amélioré selon le type d'entité
      emailSubject = `Activation de votre compte ${entityNames[entityType]}`;
      
      if (entityType === 'ambassador') {
        emailSubject = `Bienvenue dans l'équipe ${company?.name || ''} - Activez votre compte ambassadeur`;
        
        // Template HTML compatible email avec styles inline et tables
        emailContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header avec logo et titre -->
        <tr>
            <td style="padding: 40px 20px; text-align: center; background-color: #3b82f6;">
                ${company?.logo_url ? `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                    <tr>
                        <td style="text-align: center; padding-bottom: 20px;">
                            <img src="${company.logo_url}" alt="${company.name || 'Logo'}" style="max-height: 60px; max-width: 200px; height: auto; width: auto; display: block; margin: 0 auto;">
                        </td>
                    </tr>
                </table>
                ` : ''}
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${company?.name || 'Leazr'}</h1>
            </td>
        </tr>
        
        <!-- Contenu principal -->
        <tr>
            <td style="padding: 40px 20px;">
                <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Bienvenue dans l'équipe, ${firstName || ''} ${lastName || ''}!</h2>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Nous sommes ravis de vous accueillir en tant qu'ambassadeur chez <strong>${company?.name || ''}</strong>.
                    Votre expertise et votre passion seront des atouts précieux pour notre équipe.
                </p>
                
                <!-- Encadré mission -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 20px 0;">
                    <tr>
                        <td style="background-color: #f1f5f9; padding: 20px; border-left: 4px solid #3b82f6;">
                            <p style="color: #475569; margin: 0; font-size: 14px;">
                                <strong>🎯 Votre mission :</strong> Développer notre réseau et accompagner nos clients 
                                dans leurs projets de leasing avec excellence et professionnalisme.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Pour commencer, vous devez activer votre compte en cliquant sur le bouton ci-dessous :
                </p>
                
                <!-- Bouton d'activation -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 30px 0;">
                    <tr>
                        <td style="text-align: center;">
                            <a href="${activationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; mso-hide: all;">
                                Activer mon compte ambassadeur
                            </a>
                        </td>
                    </tr>
                </table>
                
                <!-- Lien de secours -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 20px 0;">
                    <tr>
                        <td style="text-align: center; font-size: 14px; color: #64748b;">
                            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                            <a href="${activationUrl}" style="color: #3b82f6; word-break: break-all;">${activationUrl}</a>
                        </td>
                    </tr>
                </table>
                
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                    Une fois votre compte activé, vous aurez accès à votre tableau de bord personnalisé, à la gestion de vos clients, au suivi de vos commissions et aux outils de prospection.
                </p>
                
                <p style="color: #475569; font-size: 14px; margin: 10px 0;">
                    Ce lien expirera dans 7 jours.
                </p>
                
                <p style="color: #475569; font-weight: bold; font-size: 16px; margin: 20px 0 0 0;">
                    Bienvenue dans l'aventure ${company?.name || ''}!
                </p>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="padding: 20px; background-color: #f8fafc; text-align: center; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} ${company?.name || 'Leazr'}. Tous droits réservés.
            </td>
        </tr>
    </table>
</body>
</html>
        `;
      } else {
        // Template simple pour les autres types d'entités
        emailContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
            <td style="padding: 40px 20px;">
                <h1 style="color: #1e293b; margin: 0 0 20px 0;">Bienvenue !</h1>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Bonjour ${firstName || ''},</p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Votre compte ${entityNames[entityType]} a été créé avec succès pour l'entreprise ${company?.name || ''}.</p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Pour activer votre compte et définir votre mot de passe, cliquez sur le lien ci-dessous :</p>
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                    <tr>
                        <td>
                            <a href="${activationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold;">Activer mon compte</a>
                        </td>
                    </tr>
                </table>
                
                <p style="color: #475569; font-size: 14px; margin: 15px 0;">Ce lien expirera dans 7 jours.</p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">Cordialement,<br>L'équipe ${company?.name || ''}</p>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
      }
    }

    // 10. Créer une version texte pour l'email
    const textContent = `
Bonjour ${firstName || ''} ${lastName || ''},

${entityType === 'ambassador' ? 
  `Nous sommes ravis de vous accueillir en tant qu'ambassadeur chez ${company?.name || ''}.
  
  Votre mission : Développer notre réseau et accompagner nos clients dans leurs projets de leasing avec excellence et professionnalisme.` : 
  `Votre compte ${entityNames[entityType]} a été créé avec succès pour l'entreprise ${company?.name || ''}.`
}

Pour activer votre compte et définir votre mot de passe, cliquez sur le lien ci-dessous :
${activationUrl}

Ce lien expirera dans 7 jours.

${entityType === 'ambassador' ? 
  `Une fois votre compte activé, vous aurez accès à votre tableau de bord personnalisé, à la gestion de vos clients, au suivi de vos commissions et aux outils de prospection.
  
  Bienvenue dans l'aventure ${company?.name || ''}!` : 
  `Cordialement,
  L'équipe ${company?.name || ''}`
}

---
© ${new Date().getFullYear()} ${company?.name || 'Leazr'}. Tous droits réservés.
    `.trim();

    // 11. Envoyer l'email via Resend avec version HTML et texte
    const emailResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: emailSubject,
      html: emailContent,
      text: textContent,
    });

    console.log('Email envoyé:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userData.user.id,
        message: 'Compte créé et email d\'activation envoyé via Resend'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Erreur dans create-account-custom:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);