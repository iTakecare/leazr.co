import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSiteSettings } from "./settingsService";
import { getCurrentUserCompanyId } from '@/services/multiTenantService';
import { checkDataIsolation } from '@/utils/crmCacheUtils';

interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailTemplateData {
  id?: number;
  type: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Récupère un modèle d'email par type
 */
export const getEmailTemplate = async (
  type: string
): Promise<EmailTemplateData | null> => {
  try {
    console.log(`Tentative de récupération du modèle d'email de type: ${type}`);
    
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', type)
      .eq('active', true)
      .single();
    
    if (error) {
      console.error("Erreur lors de la récupération du modèle d'email:", error);
      
      // Si c'est une erreur de permission, afficher plus d'informations
      if (error.code === '42501') {
        console.error("Erreur de permission - vérifiez que l'utilisateur a le bon rôle dans la table profiles");
        
        // Vérifier le profil de l'utilisateur pour diagnostic
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();
          
        if (profileError) {
          console.error("Erreur lors de la récupération du profil utilisateur:", profileError);
        } else {
          console.log("Profil utilisateur actuel:", userProfile);
        }
      }
      
      return null;
    }
    
    if (!data) {
      console.log('No email template found for this company');
      return null;
    }
    
    // Vérifier l'isolation par entreprise
    try {
      const userCompanyId = await getCurrentUserCompanyId();
      const dataWithCompanyId = [{ ...data, company_id: data.company_id }];
      const isIsolationValid = checkDataIsolation(userCompanyId, dataWithCompanyId, 'email_templates');
      
      if (!isIsolationValid) {
        // L'isolation a échoué, la fonction checkDataIsolation gère le rafraîchissement
        return null;
      }
    } catch (error) {
      console.error('Error checking company isolation for email template:', error);
    }
    
    console.log(`Modèle d'email récupéré avec succès:`, data);
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération du modèle d'email:", error);
    return null;
  }
};

/**
 * Récupère tous les templates email pour la gestion
 */
export const getAllEmailTemplates = async (): Promise<EmailTemplateData[]> => {
  try {
    console.log('Fetching all email templates for company');
    
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('type', { ascending: true });
    
    if (error) {
      console.error("Error fetching email templates:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No email templates found for this company');
      return [];
    }
    
    // Vérifier l'isolation par entreprise
    try {
      const userCompanyId = await getCurrentUserCompanyId();
      const dataWithCompanyId = data.map(template => ({ ...template, company_id: template.company_id }));
      const isIsolationValid = checkDataIsolation(userCompanyId, dataWithCompanyId, 'email_templates');
      
      if (!isIsolationValid) {
        // L'isolation a échoué, la fonction checkDataIsolation gère le rafraîchissement
        return [];
      }
    } catch (error) {
      console.error('Error checking company isolation for email templates:', error);
    }
    
    console.log(`Found ${data.length} email templates`);
    return data;
  } catch (error) {
    console.error("Exception while fetching email templates:", error);
    return [];
  }
};

/**
 * Injecte le logo du site dans le contenu HTML d'un email
 */
const injectSiteLogo = async (htmlContent: string): Promise<string> => {
  try {
    const settings = await getSiteSettings();
    
    if (settings?.logo_url) {
      // Remplacer la variable {{site_logo}} par l'URL du logo
      htmlContent = htmlContent.replace(/{{site_logo}}/g, settings.logo_url);
      
      // Si le template n'a pas de placeholder pour le logo mais commence par une div,
      // ajouter le logo au début
      if (!htmlContent.includes('{{site_logo}}') && htmlContent.trim().startsWith('<div')) {
        const logoHtml = `<div style="text-align: center; margin-bottom: 20px;">
          <img src="${settings.logo_url}" alt="Logo" style="max-width: 200px; height: auto;" />
        </div>`;
        htmlContent = htmlContent.replace(/(<div[^>]*>)/, `$1${logoHtml}`);
      }
    }
    
    return htmlContent;
  } catch (error) {
    console.error("Erreur lors de l'injection du logo:", error);
    return htmlContent;
  }
};

/**
 * Génère un lien de création de compte pour un client
 */
export const generateAccountCreationLink = async (
  email: string
): Promise<string> => {
  try {
    // Use available auth admin generateLink function
    const { data, error } = await supabase.functions.invoke('generate-auth-link', {
      body: {
        type: 'signup',
        email: email,
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error("Erreur lors de la génération du lien de création de compte:", error);
      // Fallback vers l'URL de base du site avec l'email en paramètre
      return `${window.location.origin}/auth/signup?email=${encodeURIComponent(email)}`;
    }
    
    if (data?.link) {
      return data.link;
    }
    
    return `${window.location.origin}/auth/signup?email=${encodeURIComponent(email)}`;
  } catch (error) {
    console.error("Exception lors de la génération du lien de création de compte:", error);
    return `${window.location.origin}/auth/signup?email=${encodeURIComponent(email)}`;
  }
};

/**
 * Envoie un email en utilisant Resend
 */
export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<boolean> => {
  try {
    console.log(`📧 DÉBUT ENVOI EMAIL - DIAGNOSTIC DÉTAILLÉ`);
    console.log(`🎯 ÉTAPE 1: Validation des paramètres d'entrée`);
    console.log(`   → Destinataire: ${to}`);
    console.log(`   → Sujet: "${subject}"`);
    console.log(`   → HTML défini: ${!!htmlContent}`);
    console.log(`   → Longueur HTML: ${htmlContent?.length || 0} caractères`);
    
    if (!to || !subject || !htmlContent) {
      console.error("❌ ERREUR: Paramètres manquants pour l'envoi d'email");
      console.error(`   → to: ${!!to}, subject: ${!!subject}, htmlContent: ${!!htmlContent}`);
      return false;
    }
    
    console.log(`🎯 ÉTAPE 2: Injection du logo du site`);
    // Injecter le logo du site dans le contenu HTML
    const htmlWithLogo = await injectSiteLogo(htmlContent);
    console.log(`   → Logo injecté, nouvelle longueur: ${htmlWithLogo.length} caractères`);
    
    console.log(`🎯 ÉTAPE 3: Récupération des paramètres SMTP`);
    // Récupérer les paramètres de configuration avec diagnostic amélioré
    console.log("   → Tentative de récupération depuis la table smtp_settings...");
    
    const { data: settings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('from_email, from_name')
      .eq('id', 1)
      .single();
      
    if (settingsError) {
      console.error("❌ ERREUR lors de la récupération des paramètres SMTP:", settingsError);
      console.error(`   → Code d'erreur: ${settingsError.code}`);
      console.error(`   → Message: ${settingsError.message}`);
      
      // Si c'est une erreur de permission, afficher plus d'informations
      if (settingsError.code === '42501') {
        console.error("   → Type: Erreur de permission RLS");
        
        // Vérifier le profil de l'utilisateur pour diagnostic
        try {
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, first_name, last_name')
            .eq('id', (await supabase.auth.getUser()).data.user?.id)
            .single();
            
          if (profileError) {
            console.error("   → Impossible de récupérer le profil utilisateur:", profileError);
          } else {
            console.log("   → Profil utilisateur actuel pour SMTP:", userProfile);
          }
        } catch (e) {
          console.error("   → Exception lors de la vérification du profil:", e);
        }
      }
      
      console.log("❌ ARRÊT DU PROCESSUS: Impossible de récupérer les paramètres SMTP");
      return false;
    }
    
    if (!settings) {
      console.error("❌ ERREUR: Aucun paramètre d'envoi d'email trouvé dans la base.");
      console.log("❌ ARRÊT DU PROCESSUS: Settings null");
      return false;
    }
    
    console.log("✅ Paramètres SMTP récupérés avec succès:");
    console.log(`   → from_email: ${settings.from_email}`);
    console.log(`   → from_name: ${settings.from_name}`);
    
    console.log(`🎯 ÉTAPE 4: Préparation du contenu email`);
    // S'assurer que le contenu HTML est bien formaté
    const formattedHtml = ensureHtmlFormat(htmlWithLogo);
    console.log(`   → HTML formaté, longueur finale: ${formattedHtml.length} caractères`);
    console.log(`   → Extrait du HTML: ${formattedHtml.substring(0, 150)}...`);
    
    // Préparer le contenu texte si non fourni
    const finalTextContent = textContent || stripHtml(formattedHtml);
    console.log(`   → Contenu texte préparé, longueur: ${finalTextContent.length} caractères`);
    
    console.log(`🎯 ÉTAPE 5: Appel de la fonction edge send-resend-email`);
    console.log("   → Préparation du payload...");
    
    const payload = {
      to,
      subject,
      html: formattedHtml,
      text: finalTextContent,
      from: {
        email: settings.from_email,
        name: settings.from_name
      }
    };
    
    console.log("   → Payload préparé:");
    console.log(`     • to: ${payload.to}`);
    console.log(`     • subject: ${payload.subject}`);
    console.log(`     • from.email: ${payload.from.email}`);
    console.log(`     • from.name: ${payload.from.name}`);
    console.log(`     • html length: ${payload.html.length}`);
    console.log(`     • text length: ${payload.text.length}`);
    
    console.log("🚀 APPEL IMMINENT de supabase.functions.invoke('send-resend-email')");
    console.log("   → Si vous ne voyez pas de logs dans send-resend-email après ce message,");
    console.log("     c'est que l'appel n'atteint pas la fonction edge.");
    
    // Appeler la fonction Supabase pour envoyer l'email via Resend
    const { data, error } = await supabase.functions.invoke('send-resend-email', {
      body: payload
    });

    console.log("📨 RETOUR de la fonction send-resend-email:");
    console.log(`   → error: ${!!error}`);
    console.log(`   → data: ${JSON.stringify(data)}`);

    if (error) {
      console.error("❌ Erreur lors de l'appel à la fonction d'envoi d'email Resend:", error);
      console.error("   → Type d'erreur:", typeof error);
      console.error("   → Détails:", JSON.stringify(error, null, 2));
      return false;
    }
    
    // Vérifier la réponse
    if (data && data.success) {
      console.log("✅ Email envoyé avec succès via Resend à:", to);
      console.log(`   → ID de message: ${data.data?.id || 'non disponible'}`);
      return true;
    } else {
      console.error("❌ Échec de l'envoi d'email via Resend:");
      console.error("   → Erreur:", data?.error || "Raison inconnue");
      console.error("   → Message:", data?.message || "Aucun message");
      console.error("   → Data complète:", JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error("💥 EXCEPTION GÉNÉRALE lors de l'envoi de l'email:");
    console.error("   → Type:", typeof error);
    console.error("   → Message:", error instanceof Error ? error.message : String(error));
    console.error("   → Stack:", error instanceof Error ? error.stack : 'Non disponible');
    return false;
  }
};

/**
 * S'assure que le contenu HTML est correctement formaté
 */
const ensureHtmlFormat = (html: string): string => {
  // Si le contenu ne commence pas par un tag HTML, l'envelopper dans un div
  if (!html.trim().startsWith('<')) {
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">${html}</div>`;
  }
  
  // Si le contenu ne contient pas de balises body ou html, s'assurer qu'il a une structure de base
  if (!html.includes('<body') && !html.includes('<html')) {
    // S'assurer que le style de base est appliqué au contenu existant
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Email</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; color: #333333;">
    ${html}
  </div>
</body>
</html>`;
  }
  
  // Retourner le HTML tel quel s'il semble déjà formaté correctement
  return html;
};

/**
 * Génère et envoie un email de bienvenue pour un nouveau compte utilisateur
 */
export const sendWelcomeEmail = async (
  email: string, 
  name: string, 
  userType: "partner" | "ambassador" | "client"
): Promise<boolean> => {
  try {
    console.log(`Préparation de l'email de bienvenue pour ${email} (${userType})`);
    
    // Récupérer le modèle d'email de bienvenue
    const template = await getEmailTemplate("welcome");
    
    const typeDisplay = 
      userType === "partner" ? "partenaire" : 
      userType === "ambassador" ? "ambassadeur" : 
      "client";
    
    let subject = `Bienvenue sur votre compte ${typeDisplay} iTakecare`;
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{site_logo}}" alt="Logo iTakecare" style="max-width: 200px; height: auto;" />
        </div>
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bienvenue ${name},</h2>
        <p>Votre compte ${typeDisplay} a été créé avec succès sur la plateforme iTakecare.</p>
        <p>Vous recevrez un email séparé pour définir votre mot de passe et accéder à votre espace ${typeDisplay}.</p>
        <p>Une fois connecté, vous pourrez :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          ${userType === "partner" ? `
            <li>Créer et gérer des offres de leasing</li>
            <li>Suivre vos commissions</li>
            <li>Gérer vos clients</li>
          ` : userType === "ambassador" ? `
            <li>Suivre vos recommandations</li>
            <li>Consulter vos commissions</li>
            <li>Gérer votre profil</li>
          ` : `
            <li>Consulter vos contrats</li>
            <li>Suivre vos équipements</li>
            <li>Effectuer des demandes</li>
          `}
        </ul>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `;
    
    // Utiliser le modèle personnalisé s'il existe
    if (template) {
      subject = template.subject.replace("{{client_name}}", name);
      htmlContent = template.html_content.replace(/{{client_name}}/g, name);
      
      // S'assurer que le template contient le placeholder pour le logo
      if (!htmlContent.includes('{{site_logo}}')) {
        // Ajouter le logo au début du contenu si le placeholder n'existe pas
        htmlContent = htmlContent.replace(/(<div[^>]*style="[^"]*">)/, `$1<div style="text-align: center; margin-bottom: 20px;"><img src="{{site_logo}}" alt="Logo" style="max-width: 200px; height: auto;" /></div>`);
      }
    }
    
    console.log(`Tentative d'envoi d'email de bienvenue à: ${email}`);
    
    const success = await sendEmail(
      email,
      subject,
      htmlContent
    );
    
    if (success) {
      toast.success("Email de bienvenue envoyé avec succès");
      console.log(`Email de bienvenue envoyé avec succès à: ${email}`);
    } else {
      // Notification utilisateur masquée pour éviter de perturber l'expérience utilisateur
      console.error(`Échec de l'envoi de l'email de bienvenue à: ${email}`);
    }
    
    return success;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
};

/**
 * Envoie un email d'invitation pour créer un mot de passe
 */
export const sendInvitationEmail = async (
  email: string,
  name: string,
  userType: "partner" | "ambassador" | "client",
  inviteLink?: string
): Promise<boolean> => {
  try {
    console.log(`Préparation de l'email d'invitation pour ${email} (${userType})`);
    
    const typeDisplay = 
      userType === "partner" ? "partenaire" : 
      userType === "ambassador" ? "ambassadeur" : 
      "client";
    
    const subject = `Invitation à créer votre compte ${typeDisplay} iTakecare`;
    
    // Utiliser le lien d'invitation fourni ou un lien de réinitialisation par défaut
    const actionLink = inviteLink || `${window.location.origin}/update-password`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{site_logo}}" alt="Logo iTakecare" style="max-width: 200px; height: auto;" />
        </div>
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bienvenue ${name},</h2>
        <p>Un compte ${typeDisplay} a été créé pour vous sur la plateforme iTakecare.</p>
        <p>Pour activer votre compte et définir votre mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="${actionLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Créer mon mot de passe
          </a>
        </p>
        <p>Une fois votre mot de passe créé, vous pourrez accéder à votre espace ${typeDisplay} et :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          ${userType === "partner" ? `
            <li>Créer et gérer des offres de leasing</li>
            <li>Suivre vos commissions</li>
            <li>Gérer vos clients</li>
          ` : userType === "ambassador" ? `
            <li>Suivre vos recommandations</li>
            <li>Consulter vos commissions</li>
            <li>Gérer votre profil</li>
          ` : `
            <li>Consulter vos contrats</li>
            <li>Suivre vos équipements</li>
            <li>Effectuer des demandes</li>
          `}
        </ul>
        <p><strong>Important :</strong> Ce lien est valide pendant 24 heures. Si vous rencontrez un problème, contactez-nous.</p>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `;
    
    console.log(`Tentative d'envoi d'email d'invitation à: ${email}`);
    
    const success = await sendEmail(
      email,
      subject,
      htmlContent
    );
    
    if (success) {
      console.log(`Email d'invitation envoyé avec succès à: ${email}`);
    } else {
      console.error(`Échec de l'envoi de l'email d'invitation à: ${email}`);
    }
    
    return success;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
};

/**
 * Demande des documents complémentaires au client
 */
export const sendDocumentsRequestEmail = async (
  offerId: string,
  clientEmail: string,
  clientName: string,
  requestedDocs: string[],
  customMessage?: string
): Promise<boolean> => {
  try {
    console.log(`Envoi de la demande de documents à ${clientEmail}`);
    
    // Récupérer le modèle d'email s'il existe
    const template = await getEmailTemplate("document_request");
    
    let subject = `Demande de documents complémentaires pour votre offre`;
    let docsList = requestedDocs.map(doc => `<li>${doc}</li>`).join('');
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Documents complémentaires requis</h2>
        <p>Bonjour ${clientName},</p>
        <p>Pour finaliser le traitement de votre offre, nous avons besoin des documents suivants:</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          ${docsList}
        </ul>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>Merci de nous transmettre ces documents dès que possible en répondant à cet email ou via votre espace client.</p>
        <p style="margin-top: 30px;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `;
    
    if (template) {
      subject = template.subject.replace("{{client_name}}", clientName);
      
      htmlContent = template.html_content
        .replace(/{{client_name}}/g, clientName)
        .replace(/{{documents_list}}/g, docsList)
        .replace(/{{custom_message}}/g, customMessage || '');
    }
    
    const { data, error } = await supabase.functions.invoke('send-document-request', {
      body: {
        offerId,
        clientEmail,
        clientName,
        requestedDocs,
        customMessage,
        subject,
        htmlContent
      }
    });
    
    if (error) {
      console.error("Erreur lors de l'appel à la fonction d'envoi de demande de documents:", error);
      return false;
    }
    
    if (data && data.success) {
      console.log("Demande de documents envoyée avec succès");
      toast.success("Demande de documents envoyée avec succès");
      return true;
    } else {
      console.error("Échec de l'envoi de la demande de documents:", data?.message || "Raison inconnue");
      toast.error("Échec de l'envoi de la demande de documents");
      return false;
    }
  } catch (error) {
    console.error("Exception lors de l'envoi de la demande de documents:", error);
    toast.error("Erreur lors de l'envoi de la demande de documents");
    return false;
  }
};

/**
 * Envoie un email de réinitialisation de mot de passe
 */
export const sendPasswordResetEmail = async (
  email: string
): Promise<boolean> => {
  try {
    console.log(`Envoi d'un email de réinitialisation de mot de passe à: ${email}`);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });
    
    if (error) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", error);
      toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
      return false;
    }
    
    toast.success("Email de réinitialisation envoyé avec succès");
    return true;
  } catch (error) {
    console.error("Exception lors de l'envoi de l'email de réinitialisation:", error);
    toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
    return false;
  }
};

/**
 * Envoie un email pour notifier le client qu'une offre est prête à être consultée
 */
export const sendOfferReadyEmail = async (
  clientEmail: string,
  clientName: string,
  offerInfo: {
    id: string;
    description: string;
    amount: number;
    monthlyPayment: number;
  },
  offerLink?: string // Nouveau paramètre optionnel pour le lien
): Promise<boolean> => {
  try {
    console.log(`📧 DÉBUT sendOfferReadyEmail - DIAGNOSTIC COMPLET`);
    console.log(`🎯 PARAMÈTRES REÇUS:`);
    console.log(`   → clientEmail: ${clientEmail}`);
    console.log(`   → clientName: ${clientName}`);
    console.log(`   → offerInfo:`, JSON.stringify(offerInfo, null, 2));
    console.log(`   → offerLink: ${offerLink}`);
    
    // Récupérer le modèle d'email
    console.log(`🎯 ÉTAPE 1: Récupération du template email`);
    const template = await getEmailTemplate("offer_ready");
    console.log(`   → Template trouvé: ${!!template}`);
    
    // Utiliser le lien fourni ou construire un lien par défaut
    const finalOfferLink = offerLink || `${window.location.origin}/client/sign-offer/${offerInfo.id}`;
    console.log(`🔗 Lien de l'offre utilisé: ${finalOfferLink}`);
    
    // Formater la description de l'équipement avant de l'utiliser
    console.log(`🎯 ÉTAPE 2: Formatage de la description`);
    const formattedDescription = formatEquipmentDescription(offerInfo.description);
    console.log(`   → Description formatée: ${formattedDescription}`);
    
    // Formater les montants
    const formattedAmount = offerInfo.amount.toLocaleString('fr-FR');
    const formattedMonthlyPayment = offerInfo.monthlyPayment.toLocaleString('fr-FR');
    console.log(`   → Montant formaté: ${formattedAmount}`);
    console.log(`   → Mensualité formatée: ${formattedMonthlyPayment}`);

    let subject = `Votre contrat pour ${formattedDescription} est prêt à signer`;
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="{{site_logo}}" alt="Logo" style="max-width: 200px; height: auto;" />
        </div>
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour ${clientName},</h2>
        <p>Nous avons le plaisir de vous informer que votre contrat de financement est maintenant disponible pour consultation et signature.</p>
        <p><strong>Détails du contrat:</strong></p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement: ${formattedDescription}</li>
          <li>Montant financé: ${formattedAmount} €</li>
          <li>Mensualité: ${formattedMonthlyPayment} €</li>
        </ul>
        <p>Pour consulter les détails complets et signer votre contrat, veuillez cliquer sur le lien ci-dessous:</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="${finalOfferLink}" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            Consulter et signer mon contrat
          </a>
        </p>
        <p>Ce lien vous permet d'accéder à votre contrat et de le signer électroniquement si les conditions vous conviennent.</p>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `;
    
    // Utiliser le modèle personnalisé s'il existe
    if (template) {
      console.log("   → Utilisation du template depuis la DB");
      
      subject = template.subject
        .replace(/{{client_name}}/g, clientName)
        .replace(/{{equipment_description}}/g, formattedDescription);
        
      htmlContent = template.html_content
        .replace(/{{client_name}}/g, clientName)
        .replace(/{{equipment_description}}/g, formattedDescription)
        .replace(/{{amount}}/g, formattedAmount)
        .replace(/{{monthly_payment}}/g, formattedMonthlyPayment)
        .replace(/{{offer_link}}/g, finalOfferLink);
        
      // S'assurer que le template contient le placeholder pour le logo
      if (!htmlContent.includes('{{site_logo}}')) {
        htmlContent = htmlContent.replace(/(<div[^>]*>)/, `$1<div style="text-align: center; margin-bottom: 20px;"><img src="{{site_logo}}" alt="Logo" style="max-width: 200px; height: auto;" /></div>`);
      }
    } else {
      console.log("   → Utilisation du template par défaut");
    }
    
    console.log(`🎯 ÉTAPE 3: Contenu email préparé`);
    console.log(`   → Sujet: ${subject}`);
    console.log(`   → Longueur HTML: ${htmlContent.length} caractères`);
    console.log(`   → Lien final: ${finalOfferLink}`);
    
    console.log(`🚀 ÉTAPE 4: Appel sendEmail - ICI ON DEVRAIT VOIR LES LOGS DE DIAGNOSTIC`);
    
    // Envoyer l'email
    const success = await sendEmail(
      clientEmail,
      subject,
      htmlContent
    );
    
    console.log(`📧 RÉSULTAT sendOfferReadyEmail: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    
    if (success) {
      console.log(`✅ Email "contrat prêt à signer" envoyé avec succès à: ${clientEmail}`);
      return true;
    } else {
      console.error(`❌ Échec de l'envoi de l'email "contrat prêt à signer" à: ${clientEmail}`);
      return false;
    }
  } catch (error) {
    console.error("💥 Exception lors de l'envoi de l'email de contrat prêt:", error);
    return false;
  }
};

/**
 * Formatte correctement la description de l'équipement pour l'email
 */
const formatEquipmentDescription = (description: string): string => {
  try {
    // Vérifier si la description est un JSON (chaîne JSON ou objet)
    let equipmentItems = null;
    
    if (typeof description === 'string') {
      if (description.startsWith('[{') && description.endsWith('}]')) {
        equipmentItems = JSON.parse(description);
      } else if (description.startsWith('{') && description.endsWith('}')) {
        // Si c'est un seul objet JSON
        equipmentItems = [JSON.parse(description)];
      }
    } else if (Array.isArray(description)) {
      equipmentItems = description;
    } else if (typeof description === 'object' && description !== null) {
      equipmentItems = [description];
    }
    
    if (Array.isArray(equipmentItems) && equipmentItems.length > 0) {
      if (equipmentItems.length === 1) {
        // Si un seul élément, afficher simplement le titre
        return equipmentItems[0].title || "Votre équipement";
      } else {
        // Si plusieurs éléments, créer un résumé
        const firstTitle = equipmentItems[0].title || "équipement";
        return `${equipmentItems.length} équipements dont ${firstTitle}`;
      }
    }
    
    // Si ce n'est pas un format JSON reconnu, renvoyer la description telle quelle
    return description || "Votre équipement";
  } catch (e) {
    console.log("Erreur lors du parsing de la description:", e);
    return description || "Votre équipement";
  }
};

/**
 * Utilitaire pour supprimer les balises HTML d'une chaîne
 */
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '');
};
