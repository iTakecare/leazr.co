
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

    // Get the authorization header to extract user info
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Create a regular Supabase client for user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    // Get the current user's company_id
    const { data: profileData, error: profileError } = await supabase
      .rpc('get_current_user_profile');

    if (profileError || !profileData || profileData.length === 0) {
      console.error("Erreur lors de la récupération du profil utilisateur:", profileError);
      throw new Error('Impossible de récupérer le profil utilisateur');
    }

    const companyId = profileData[0].company_id;
    if (!companyId) {
      throw new Error('Aucune entreprise associée à cet utilisateur');
    }

    console.log("Company ID récupéré:", companyId);
    
    // Modèles d'email à initialiser avec design responsive et optimisé (450px max)
    const templates = [
      {
        type: 'document_request',
        name: 'Demande de documents',
        subject: 'Documents requis - {{company_name}}',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Documents requis pour votre dossier</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Bonjour {{client_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Nous avons besoin de documents supplémentaires pour traiter votre demande de leasing avec <strong>{{company_name}}</strong>.
    </p>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">Documents demandés :</h3>
      <div style="color: #374151; font-size: 14px;">{{requested_documents}}</div>
    </div>
    {{#if custom_message}}
    <div style="background-color: #e3f2fd; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <h4 style="margin: 0 0 8px 0; color: #1976d2; font-size: 14px;">Message personnalisé :</h4>
      <p style="margin: 0; color: #374151; font-size: 14px;">{{custom_message}}</p>
    </div>
    {{/if}}
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Veuillez cliquer sur le lien ci-dessous pour télécharger vos documents :
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{upload_link}}" style="background-color: #3b82f6; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Télécharger mes documents
      </a>
    </div>
    <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin: 16px 0;">
      <p style="margin: 0; color: #92400e; font-size: 13px;">
        <strong>⚠️ Important :</strong> Ce lien est sécurisé et expire après 7 jours. Formats acceptés : PDF, JPG, PNG, DOCX.
      </p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 0;">
      Cordialement,<br>L'équipe {{company_name}}
    </p>
  </div>
</div>`,
        active: true
      },
      {
        type: 'new_account',
        name: 'Création de compte',
        subject: 'Votre compte a été créé avec succès',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 22px; margin-bottom: 18px; text-align: center;">Bienvenue chez iTakecare !</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Bonjour {{user_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Votre compte iTakecare a été créé avec succès. Vous pouvez maintenant accéder à votre espace personnel.
    </p>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Email :</strong> {{user_email}}</p>
      <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>Mot de passe :</strong> {{temp_password}}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{login_link}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Accéder à mon compte
      </a>
    </div>
    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
      Changez votre mot de passe lors de votre première connexion.
    </p>
  </div>
</div>`,
        active: true
      },
      {
        type: 'password_reset',
        name: 'Réinitialisation de mot de passe',
        subject: 'Réinitialisez votre mot de passe iTakecare',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 22px; margin-bottom: 18px; text-align: center;">Réinitialisation de mot de passe</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 18px;">
      Vous avez demandé la réinitialisation de votre mot de passe.
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="{{reset_link}}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Réinitialiser mon mot de passe
      </a>
    </div>
    <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0;">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>
  </div>
</div>`,
        active: true
      },
      {
        type: 'welcome',
        name: 'Email de bienvenue',
        subject: 'Bienvenue dans l\'univers iTakecare !',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 22px; margin-bottom: 18px; text-align: center;">Bienvenue {{user_name}} !</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Nous sommes ravis de vous accueillir sur notre plateforme.
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Votre compte a été créé avec succès. Vous pouvez maintenant commencer à utiliser nos services.
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="{{login_link}}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Accéder à mon compte
      </a>
    </div>
  </div>
</div>`,
        active: true
      },
      {
        type: 'ambassador_account',
        name: 'Création de compte ambassadeur',
        subject: 'Félicitations ! Vous êtes maintenant ambassadeur iTakecare',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Bienvenue en tant qu'ambassadeur !</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Bonjour {{user_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Votre compte ambassadeur a été créé avec succès. Vous pouvez maintenant :
    </p>
    <ul style="color: #374151; font-size: 14px; line-height: 1.4; margin-bottom: 16px; padding-left: 18px;">
      <li>Gérer vos clients et prospects</li>
      <li>Suivre vos commissions</li>
      <li>Créer des offres personnalisées</li>
      <li>Accéder à vos outils de vente</li>
    </ul>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Email :</strong> {{user_email}}</p>
      <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>Mot de passe :</strong> {{temp_password}}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{login_link}}" style="background-color: #3b82f6; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Accéder à mon espace ambassadeur
      </a>
    </div>
    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
      Changez votre mot de passe lors de votre première connexion.
    </p>
  </div>
</div>`,
        active: true
      },
      {
        type: 'client_account',
        name: 'Création de compte client',
        subject: 'Bienvenue chez {{company_name}} - Activez votre compte client',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    {{#if company_logo}}
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 50px; max-width: 150px;">
    </div>
    {{/if}}
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Bienvenue chez {{company_name}}</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Bonjour {{user_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Nous sommes ravis de vous compter parmi nos clients. Votre compte client a été créé avec succès et vous donne accès à nos services exclusifs.
    </p>
    <div style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 6px; padding: 12px; margin: 16px 0;">
      <p style="margin: 0; color: #047857; font-size: 14px;">
        <strong>🌟 Vos avantages :</strong> Accès privilégié à nos solutions, suivi personnalisé de vos dossiers et support dédié.
      </p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Pour accéder à votre espace personnel, activez votre compte :
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{activation_url}}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
        Activer mon compte client
      </a>
    </div>
    <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
      Ce lien d'activation expirera dans 7 jours.
    </p>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 16px 0 0 0;">
      {{company_name}} - {{current_year}}
    </p>
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <a href="#" style="display: inline-block; color: #059669; text-decoration: none; font-size: 13px; margin-right: 15px;">
        📋 Nos conditions générales
      </a>
      <a href="#" style="display: inline-block; color: #059669; text-decoration: none; font-size: 13px;">
        📄 Télécharger le contrat
      </a>
    </div>
  </div>
</div>`,
        active: true
      },
      {
        type: 'collaborator_account',
        name: 'Création de compte collaborateur',
        subject: 'Accès accordé : Bienvenue dans l\'équipe iTakecare',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Bienvenue dans l'équipe !</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Bonjour {{user_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Votre compte collaborateur a été créé avec succès. Vous avez maintenant accès :
    </p>
    <ul style="color: #374151; font-size: 14px; line-height: 1.4; margin-bottom: 16px; padding-left: 18px;">
      <li>Aux outils de gestion d'entreprise</li>
      <li>À la gestion des clients et offres</li>
      <li>Aux rapports et statistiques</li>
      <li>Aux paramètres de configuration</li>
    </ul>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Email :</strong> {{user_email}}</p>
      <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>Mot de passe :</strong> {{temp_password}}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{login_link}}" style="background-color: #3b82f6; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Accéder à l'interface de gestion
      </a>
    </div>
    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
      Changez votre mot de passe lors de votre première connexion.
    </p>
  </div>
</div>`,
        active: true
      },
      {
        type: 'offer_notification',
        name: 'Notification d\'offre',
        subject: '📄 Votre offre de leasing personnalisée est prête',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Nouvelle offre de leasing</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Bonjour {{client_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Une nouvelle offre de leasing personnalisée a été préparée pour vous.
    </p>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Montant :</strong> {{offer_amount}}</p>
      <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>Mensualité :</strong> {{monthly_payment}}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{offer_link}}" style="background-color: #3b82f6; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Voir l'offre
      </a>
    </div>
  </div>
</div>`,
        active: true
      },
      {
        type: 'contract_signed',
        name: 'Contrat signé',
        subject: '✅ Votre contrat a été signé avec succès',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Contrat signé avec succès</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Félicitations {{client_name}} !
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Votre contrat de leasing a été signé avec succès.
    </p>
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Numéro de contrat :</strong> {{contract_number}}</p>
      <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>Date de signature :</strong> {{signature_date}}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{contract_link}}" style="background-color: #3b82f6; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Télécharger le contrat
      </a>
    </div>
  </div>
</div>`,
        active: true
      },
      {
        type: 'ambassador_account_deleted',
        name: 'Suppression de compte ambassadeur',
        subject: 'Votre compte ambassadeur a été supprimé',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Compte ambassadeur supprimé</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Bonjour {{user_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Nous vous informons que votre compte ambassadeur iTakecare a été supprimé le {{deletion_date}}.
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Cette action a été effectuée à votre demande ou par l'administrateur de votre organisation.
    </p>
    <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin: 16px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Important :</strong> Toutes vos données personnelles ont été supprimées de manière sécurisée.
      </p>
    </div>
    <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
      Merci pour votre collaboration en tant qu'ambassadeur {{company_name}}.
    </p>
  </div>
</div>`,
        active: true
      },
      {
        type: 'client_account_deleted',
        name: 'Suppression de compte client',
        subject: 'Votre compte client a été supprimé',
        html_content: `
<div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 15px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px; text-align: center;">Compte client supprimé</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Bonjour {{user_name}},
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Nous vous informons que votre compte client iTakecare a été supprimé le {{deletion_date}}.
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 14px;">
      Cette action a été effectuée à votre demande ou par l'administrateur de votre organisation.
    </p>
    <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin: 16px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Important :</strong> Toutes vos données personnelles ont été supprimées de manière sécurisée.
      </p>
    </div>
    <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
      Merci pour votre confiance envers {{company_name}}.
    </p>
  </div>
</div>`,
        active: true
      }
    ];
    
    console.log(`Forçage de la mise à jour de ${templates.length} modèles d'email...`);
    
    // Supprimer les templates existants de cette entreprise
    const { error: deleteError } = await supabaseAdmin
      .from('email_templates')
      .delete()
      .eq('company_id', companyId);
      
    if (deleteError) {
      console.error('Erreur lors de la suppression des anciens modèles:', deleteError);
    } else {
      console.log('Tous les anciens modèles supprimés avec succès');
    }
    
    // Insérer tous les nouveaux modèles
    let insertedCount = 0;
    let totalCount = templates.length;
    
    for (const template of templates) {
      console.log(`Création forcée du modèle ${template.type}...`);
      
      const { error: insertError } = await supabaseAdmin
        .from('email_templates')
        .insert({
          type: template.type,
          name: template.name,
          subject: template.subject,
          html_content: template.html_content,
          active: template.active,
          company_id: companyId,
          created_at: new Date(),
          updated_at: new Date()
        });
        
      if (insertError) {
        console.error(`Erreur lors de la création du modèle ${template.type}:`, insertError);
      } else {
        console.log(`Modèle ${template.type} créé avec succès`);
        insertedCount++;
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
