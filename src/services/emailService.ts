import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSiteSettings } from "./settingsService";

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
    
    console.log(`Modèle d'email récupéré avec succès:`, data);
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération du modèle d'email:", error);
    return null;
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
    console.log(`📧 DÉBUT ENVOI EMAIL`);
    console.log(`Destinataire: ${to}`);
    console.log(`Sujet: "${subject}"`);
    
    // Injecter le logo du site dans le contenu HTML
    const htmlWithLogo = await injectSiteLogo(htmlContent);
    
    // Récupérer les paramètres de configuration avec diagnostic amélioré
    console.log("Récupération des paramètres SMTP...");
    const { data: settings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('from_email, from_name')
      .eq('id', 1)
      .single();
      
    if (settingsError) {
      console.error("❌ Erreur lors de la récupération des paramètres SMTP:", settingsError);
      
      // Si c'est une erreur de permission, afficher plus d'informations
      if (settingsError.code === '42501') {
        console.error("Erreur de permission SMTP - vérifiez que l'utilisateur a le bon rôle dans la table profiles");
        
        // Vérifier le profil de l'utilisateur pour diagnostic
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();
          
        if (profileError) {
          console.error("Erreur lors de la récupération du profil utilisateur:", profileError);
        } else {
          console.log("Profil utilisateur actuel pour SMTP:", userProfile);
        }
      }
      
      return false;
    }
    
    if (!settings) {
      console.error("❌ Aucun paramètre d'envoi d'email trouvé.");
      return false;
    }
    
    console.log("✅ Paramètres SMTP récupérés:", { 
      from_email: settings.from_email,
      from_name: settings.from_name
    });
    
    console.log("📤 Utilisation de Resend pour l'envoi d'email");
    
    // S'assurer que le contenu HTML est bien formaté
    const formattedHtml = ensureHtmlFormat(htmlWithLogo);
    console.log("📝 Extrait du HTML formaté:", formattedHtml.substring(0, 150) + "...");
    
    // Appeler la fonction Supabase pour envoyer l'email via Resend
    console.log("🚀 Appel de la fonction send-resend-email...");
    const { data, error } = await supabase.functions.invoke('send-resend-email', {
      body: {
        to,
        subject,
        html: formattedHtml,
        text: textContent || stripHtml(formattedHtml),
        from: {
          email: settings.from_email,
          name: settings.from_name
        }
      }
    });

    if (error) {
      console.error("❌ Erreur lors de l'appel à la fonction d'envoi d'email Resend:", error);
      return false;
    }
    
    console.log("📨 Réponse de la fonction send-resend-email:", data);
    
    // Vérifier la réponse
    if (data && data.success) {
      console.log("✅ Email envoyé avec succès via Resend à:", to);
      return true;
    } else {
      console.error("❌ Échec de l'envoi d'email via Resend:");
      console.error("Erreur:", data?.error || "Raison inconnue");
      console.error("Message:", data?.message || "Aucun message");
      return false;
    }
  } catch (error) {
    console.error("💥 Exception lors de l'envoi de l'email:", error);
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
  }
): Promise<boolean> => {
  try {
    console.log(`📧 Préparation de l'email "offre prête à consulter" pour: ${clientEmail}`);
    
    // Récupérer le modèle d'email
    const template = await getEmailTemplate("offer_ready");
    
    // Préparer l'URL de l'offre - utiliser la route correcte
    const offerLink = `${window.location.origin}/client/sign-offer/${offerInfo.id}`;
    
    // Formater la description de l'équipement avant de l'utiliser
    const formattedDescription = formatEquipmentDescription(offerInfo.description);
    
    // Formater les montants
    const formattedAmount = offerInfo.amount.toLocaleString('fr-FR');
    const formattedMonthlyPayment = offerInfo.monthlyPayment.toLocaleString('fr-FR');
    
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
          <a href="${offerLink}" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
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
      console.log("Utilisation du modèle d'email 'offer_ready' depuis la base de données");
      
      subject = template.subject
        .replace(/{{client_name}}/g, clientName)
        .replace(/{{equipment_description}}/g, formattedDescription);
        
      htmlContent = template.html_content
        .replace(/{{client_name}}/g, clientName)
        .replace(/{{equipment_description}}/g, formattedDescription)
        .replace(/{{amount}}/g, formattedAmount)
        .replace(/{{monthly_payment}}/g, formattedMonthlyPayment)
        .replace(/{{offer_link}}/g, offerLink);
        
      // S'assurer que le template contient le placeholder pour le logo
      if (!htmlContent.includes('{{site_logo}}')) {
        // Ajouter le logo au début du contenu si le placeholder n'existe pas
        htmlContent = htmlContent.replace(/(<div[^>]*>)/, `$1<div style="text-align: center; margin-bottom: 20px;"><img src="{{site_logo}}" alt="Logo" style="max-width: 200px; height: auto;" /></div>`);
      }
    } else {
      console.log("Aucun template 'offer_ready' trouvé, utilisation du template par défaut");
    }
    
    console.log(`🎯 Tentative d'envoi d'email "contrat prêt à signer" à: ${clientEmail}`);
    console.log("📋 Sujet de l'email formaté:", subject);
    console.log("🔗 Lien de signature:", offerLink);
    
    // Envoyer l'email
    const success = await sendEmail(
      clientEmail,
      subject,
      htmlContent
    );
    
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
