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
      .select('name')
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

    if (smtpSettings && smtpSettings.resend_api_key && smtpSettings.resend_api_key.trim() !== '') {
      console.log('Utilisation de la clé API Resend de l\'entreprise');
      console.log('Clé API entreprise (masquée):', smtpSettings.resend_api_key.substring(0, 8) + '...');
      console.log('Clé API entreprise (complète):', smtpSettings.resend_api_key); // Log complet pour debug
      resendApiKey = smtpSettings.resend_api_key.trim(); // Nettoyer les espaces
      fromEmail = smtpSettings.from_email || fromEmail;
      fromName = smtpSettings.from_name || fromName;
    } else {
      console.log('Utilisation de la clé API Resend de fallback (LEAZR_RESEND_API)');
      console.log('Clé API fallback (masquée):', resendApiKey ? resendApiKey.substring(0, 8) + '...' : 'non définie');
      console.log('Clé API fallback (complète):', resendApiKey); // Log complet pour debug
    }

    if (!resendApiKey) {
      console.error('Aucune clé API Resend disponible');
      return new Response(
        JSON.stringify({ error: 'Configuration API Resend manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    // 8. Récupérer le template d'email
    const { data: emailTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', 'user_invitation')
      .single();

    // 9. Préparer le contenu de l'email
    const activationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/update-password?token=${activationToken}&type=invitation`;
    
    const entityNames = {
      'partner': 'partenaire',
      'ambassador': 'ambassadeur',
      'client': 'client'
    };

    let emailContent = emailTemplate?.content || `
      <h1>Bienvenue !</h1>
      <p>Bonjour ${firstName || ''},</p>
      <p>Votre compte ${entityNames[entityType]} a été créé avec succès pour l'entreprise ${company?.name || ''}.</p>
      <p>Pour activer votre compte et définir votre mot de passe, cliquez sur le lien ci-dessous :</p>
      <p><a href="${activationUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Activer mon compte</a></p>
      <p>Ce lien expirera dans 7 jours.</p>
      <p>Cordialement,<br>L'équipe ${company?.name || ''}</p>
    `;

    // Remplacer les variables dans le template
    emailContent = emailContent
      .replace(/\{\{first_name\}\}/g, firstName || '')
      .replace(/\{\{last_name\}\}/g, lastName || '')
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{company_name\}\}/g, company?.name || '')
      .replace(/\{\{activation_url\}\}/g, activationUrl)
      .replace(/\{\{entity_type\}\}/g, entityNames[entityType]);

    // 10. Envoyer l'email via Resend
    const emailResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: emailTemplate?.subject || `Activation de votre compte ${entityNames[entityType]}`,
      html: emailContent,
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