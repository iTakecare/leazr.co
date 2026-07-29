import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAccountRequest {
  email: string;
  entityType: 'partner' | 'ambassador' | 'client' | 'financing_partner';
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
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin'],
      rateLimit: {
        endpoint: 'create-account-custom',
        maxRequests: 10,
        windowSeconds: 60,
        identifierPrefix: 'create-account-custom',
      },
    });

    if (!access.ok) {
      return access.response;
    }

    // Créer un client Supabase avec la clé de service pour accès admin
    const supabase = access.context.supabaseAdmin;

    const { email, entityType, entityId, companyId, firstName, lastName, role }: CreateAccountRequest = await req.json();

    if (!email || !entityType || !entityId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, entityType, entityId, companyId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Création d'un compte pour ${email} (${entityType})`);

    if (
      !access.context.isServiceRole &&
      access.context.role !== 'super_admin'
    ) {
      if (!access.context.companyId || access.context.companyId !== companyId) {
        return new Response(
          JSON.stringify({ error: 'Cross-company account creation is forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

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

    // 3.5. Créer le rôle dans user_roles (nouveau système de sécurité Phase 1)
    const roleMapping = {
      'partner': 'partner',
      'ambassador': 'ambassador',
      'client': 'client',
      'financing_partner': 'partner'
    };
    
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: roleMapping[entityType]
      });

    if (roleError) {
      console.error('Erreur création rôle user_roles:', roleError);
      // Supprimer l'utilisateur et le profil si le rôle échoue
      await supabase.from('profiles').delete().eq('id', userData.user.id);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du rôle utilisateur' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 4. Mettre à jour l'entité avec user_id et has_user_account
    const tableMap = {
      'partner': 'partners',
      'ambassador': 'ambassadors',
      'client': 'clients',
      'financing_partner': 'financing_partners'
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

    // 6. Récupérer les informations de l'entreprise avec le slug
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url, slug')
      .eq('id', companyId)
      .single();

    // 7. Récupérer les paramètres SMTP/Email et platform_settings de l'entreprise
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();

    // Récupérer le template d'email pour l'activation
    const { data: emailTemplate } = await supabase
      .from('template_library')
      .select('*')
      .eq('company_id', companyId)
      .eq('template_type', 'account_activation')
      .eq('is_active', true)
      .single();

    const { data: platformSettings } = await supabase
      .from('platform_settings')
      .select('website_url, company_address')
      .limit(1)
      .single();

    // 8. Initialiser le client Resend et définir les paramètres d'expédition
    const resendApiKey = Deno.env.get('ITAKECARE_RESEND_API');
    console.log('🔑 ITAKECARE_RESEND_API présente:', !!resendApiKey);
    
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    
    // Définir l'expéditeur avec fallbacks sécurisés
    const fromEmail = smtpSettings?.from_email || Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@itakecare.be';
    const fromName = smtpSettings?.from_name || company?.name || 'iTakecare';
    
    console.log('📧 Expéditeur configuré:', `${fromName} <${fromEmail}>`);

    // Déterminer l'URL de base avec ordre de priorité
    let BASE_URL = 'https://leazr.co'; // Base sans slug

    // Priorité 1 : Utiliser platform_settings.website_url comme base
    if (platformSettings?.website_url) {
      try {
        BASE_URL = new URL(platformSettings.website_url).origin;
        console.log('✅ URL base détectée depuis platform_settings:', BASE_URL);
      } catch (e) {
        console.log('⚠️ website_url invalide dans platform_settings, utilisation du fallback');
      }
    }

    // Construire l'URL compatible avec query params (pas de slug dans le path)
    const companySlug = company?.slug || 'company';
    const encodedToken = encodeURIComponent(activationToken);
    const encodedType = encodeURIComponent('invitation');
    const encodedSlug = encodeURIComponent(companySlug);
    const activationUrl = `${BASE_URL}/update-password?token=${encodedToken}&type=${encodedType}&companySlug=${encodedSlug}`;

    console.log('URL d\'activation générée pour', email);

    // Variables communes pour le rendu des templates
    const templateVars: Record<string, string> = {
      user_name: `${firstName || ''} ${lastName || ''}`.trim(),
      user_email: email,
      activation_url: activationUrl,
      company_name: company?.name || '',
      company_logo: company?.logo_url || '',
      company_address: platformSettings?.company_address || '',
      current_year: new Date().getFullYear().toString(),
    };
    
    const entityNames = {
      'partner': 'partenaire',
      'ambassador': 'ambassadeur',
      'client': 'client',
      'financing_partner': 'partenaire'
    };

    let emailContent;
    let emailSubject;

    if (emailTemplate) {
      // Utiliser le template personnalisé et rendre via la fonction SQL render_email_template
      // Gérer optionnellement le bloc conditionnel {{#if company_logo}}
      const hasLogo = company?.logo_url && company.logo_url.trim() !== '';
      const rawContent = (emailTemplate.html_content || '').replace(
        /{{#if\s+company_logo}}([\s\S]*?){{\/if}}/g,
        hasLogo ? '$1' : ''
      );

      // Rendu via la fonction SQL pour remplacer toutes les variables
      const { data: renderedHtml, error: renderHtmlError } = await supabase.rpc('render_email_template', {
        template_content: rawContent,
        variables: templateVars
      });

      const { data: renderedSubject, error: renderSubjectError } = await supabase.rpc('render_email_template', {
        template_content: emailTemplate.subject || 'Activation de votre compte',
        variables: templateVars
      });

      if (renderHtmlError) {
        console.log('render_email_template(html) a échoué, fallback aux remplacements simples');
      }
      if (renderSubjectError) {
        console.log('render_email_template(subject) a échoué, fallback sujet brut');
      }

  emailContent = (renderedHtml as string) || rawContent
    .replace(/{{user_name}}/g, templateVars.user_name)
    .replace(/{{user_email}}/g, templateVars.user_email)
    .replace(/{{activation_url}}/g, templateVars.activation_url)
    .replace(/{{company_name}}/g, templateVars.company_name)
    .replace(/{{company_logo}}/g, templateVars.company_logo)
    .replace(/{{company_address}}/g, templateVars.company_address)
    .replace(/{{current_year}}/g, templateVars.current_year);

  // Backward compat: certains templates utilisent encore {{login_link}}
  emailContent = emailContent.replace(/{{login_link}}/g, templateVars.activation_url);
  
  // Gérer le sujet avec fallback manuel si le RPC échoue
  if (renderedSubject && !renderSubjectError) {
    emailSubject = renderedSubject as string;
  } else {
    // Fallback: remplacer manuellement les variables dans le sujet
    emailSubject = (emailTemplate.subject || 'Activation de votre compte')
      .replace(/{{user_name}}/g, templateVars.user_name)
      .replace(/{{user_email}}/g, templateVars.user_email)
      .replace(/{{company_name}}/g, templateVars.company_name)
      .replace(/{{current_year}}/g, templateVars.current_year);
  }
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
      } else if (entityType === 'client') {
        emailSubject = `Bienvenue chez ${company?.name || ''} - Activez votre compte client`;
        
        // Template HTML identique aux ambassadeurs mais avec couleur verte pour les clients
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
            <td style="padding: 40px 20px; text-align: center; background-color: #10b981;">
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
                <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Bienvenue, ${firstName || ''} ${lastName || ''}!</h2>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Nous sommes ravis de vous compter parmi nos clients chez <strong>${company?.name || ''}</strong>.
                    Votre compte client a été créé avec succès et vous donne accès à notre portail.
                </p>
                
                <!-- Encadré avantages -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 20px 0;">
                    <tr>
                        <td style="background-color: #f0fdf4; padding: 20px; border-left: 4px solid #10b981;">
                            <p style="color: #475569; margin: 0; font-size: 14px;">
                                <strong>🌟 Vos avantages :</strong> Accès privilégié à nos solutions, suivi personnalisé 
                                de vos dossiers et support dédié pour tous vos besoins.
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
                            <a href="${activationUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; mso-hide: all;">
                                Activer mon compte client
                            </a>
                        </td>
                    </tr>
                </table>
                
                <!-- Lien de secours -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 20px 0;">
                    <tr>
                        <td style="text-align: center; font-size: 14px; color: #64748b;">
                            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                            <a href="${activationUrl}" style="color: #10b981; word-break: break-all;">${activationUrl}</a>
                        </td>
                    </tr>
                </table>
                
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                    Une fois votre compte activé, vous aurez accès à votre espace personnel, au suivi de vos dossiers et à toutes nos fonctionnalités.
                </p>
                
                <p style="color: #475569; font-size: 14px; margin: 10px 0;">
                    Ce lien expirera dans 7 jours.
                </p>
                
                <p style="color: #475569; font-weight: bold; font-size: 16px; margin: 20px 0 0 0;">
                    Bienvenue chez ${company?.name || ''}!
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
        // Template simple pour les autres types d'entités (partners)
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
    let emailSent = false;
    let emailMessage = '';
    
    if (resend) {
      try {
        const emailResult = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject: emailSubject,
          html: emailContent,
          text: textContent,
        });

        console.log('✅ Email envoyé avec succès:', emailResult);
        emailSent = true;
        emailMessage = 'Compte créé et email d\'activation envoyé via Resend';
      } catch (emailError: any) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
        emailMessage = `Compte créé mais email non envoyé: ${emailError.message}`;
      }
    } else {
      console.log('⚠️ RESEND_API_KEY non configurée - email non envoyé');
      emailMessage = 'Compte créé (email non envoyé - clé Resend manquante)';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userData.user.id,
        activation_url: activationUrl,
        email_sent: emailSent,
        message: emailMessage
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
