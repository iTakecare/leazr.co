
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', type)
      .eq('active', true)
      .single();
    
    if (error) {
      console.error("Erreur lors de la récupération du modèle d'email:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération du modèle d'email:", error);
    return null;
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
    console.log(`Tentative d'envoi d'email à ${to} avec sujet "${subject}"`);
    
    // Récupérer les paramètres de configuration
    const { data: settings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('from_email, from_name')
      .eq('id', 1)
      .single();
      
    if (settingsError) {
      console.error("Erreur lors de la récupération des paramètres:", settingsError);
      return false;
    }
    
    if (!settings) {
      console.error("Aucun paramètre d'envoi d'email trouvé.");
      return false;
    }
    
    console.log("Paramètres récupérés:", { 
      from_email: settings.from_email,
      from_name: settings.from_name
    });
    
    console.log("Utilisation de Resend pour l'envoi d'email");
    
    // S'assurer que le contenu HTML est bien formaté
    const formattedHtml = ensureHtmlFormat(htmlContent);
    console.log("Extrait du HTML formaté:", formattedHtml.substring(0, 150) + "...");
    
    // Appeler la fonction Supabase pour envoyer l'email via Resend
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
      console.error("Erreur lors de l'appel à la fonction d'envoi d'email Resend:", error);
      return false;
    }
    
    // Vérifier la réponse
    if (data && data.success) {
      console.log("Email envoyé avec succès via Resend à:", to);
      return true;
    } else {
      console.error("Échec de l'envoi d'email via Resend:", data?.error || "Raison inconnue");
      return false;
    }
  } catch (error) {
    console.error("Exception lors de l'envoi de l'email:", error);
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
    let docsList = requestedDocs.map(doc => {
      // Convertir les codes de documents en noms lisibles
      if (doc.startsWith('custom:')) {
        return `<li>${doc.substring(7)}</li>`;
      } else {
        const docNameMap: {[key: string]: string} = {
          balance_sheet: "Bilan financier",
          tax_notice: "Avertissement extrait de rôle",
          id_card: "Copie de la carte d'identité",
          company_register: "Extrait de registre d'entreprise",
          vat_certificate: "Attestation TVA",
          bank_statement: "Relevé bancaire des 3 derniers mois"
        };
        return `<li>${docNameMap[doc] || doc}</li>`;
      }
    }).join('');
    
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
    console.log(`Préparation de l'email "offre prête à consulter" pour: ${clientEmail}`);
    
    // Récupérer le modèle d'email
    const template = await getEmailTemplate("offer_ready");
    
    // Préparer l'URL de l'offre
    const offerLink = `${window.location.origin}/client/offers/${offerInfo.id}`;
    
    let subject = `Votre offre de financement pour ${offerInfo.description} est prête`;
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour ${clientName},</h2>
        <p>Nous avons le plaisir de vous informer que votre offre de financement est maintenant disponible pour consultation.</p>
        <p><strong>Détails de l'offre:</strong></p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement: ${formatEquipmentDescription(offerInfo.description)}</li>
          <li>Montant: ${offerInfo.amount.toLocaleString('fr-FR')} €</li>
          <li>Mensualité estimée: ${offerInfo.monthlyPayment.toLocaleString('fr-FR')} €</li>
        </ul>
        <p>Pour consulter les détails complets et signer votre offre, veuillez cliquer sur le lien ci-dessous:</p>
        <p style="text-align: center; margin: 25px 0;">
          <a href="${offerLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Consulter et signer votre offre
          </a>
        </p>
        <p>Ce lien vous permet d'accéder à votre offre et de la signer électroniquement si elle vous convient.</p>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `;
    
    // Utiliser le modèle personnalisé s'il existe
    if (template) {
      console.log("Utilisation du modèle d'email 'offer_ready'");
      
      // Formater la description de l'équipement pour éviter l'affichage de JSON brut
      const formattedDescription = formatEquipmentDescription(offerInfo.description);
      
      subject = template.subject
        .replace(/{{client_name}}/g, clientName)
        .replace(/{{equipment_description}}/g, formattedDescription);
        
      htmlContent = template.html_content
        .replace(/{{client_name}}/g, clientName)
        .replace(/{{equipment_description}}/g, formattedDescription)
        .replace(/{{amount}}/g, offerInfo.amount.toLocaleString('fr-FR'))
        .replace(/{{monthly_payment}}/g, offerInfo.monthlyPayment.toLocaleString('fr-FR'))
        .replace(/{{offer_link}}/g, offerLink);
    }
    
    console.log(`Tentative d'envoi d'email "offre prête à consulter" à: ${clientEmail}`);
    console.log("Aperçu du contenu HTML:", htmlContent.substring(0, 150) + "...");
    
    // Envoyer l'email
    const success = await sendEmail(
      clientEmail,
      subject,
      htmlContent
    );
    
    if (success) {
      console.log(`Email "offre prête à consulter" envoyé avec succès à: ${clientEmail}`);
      return true;
    } else {
      console.error(`Échec de l'envoi de l'email "offre prête à consulter" à: ${clientEmail}`);
      return false;
    }
  } catch (error) {
    console.error("Exception lors de l'envoi de l'email d'offre prête:", error);
    return false;
  }
};

/**
 * Formatte correctement la description de l'équipement pour l'email
 */
const formatEquipmentDescription = (description: string): string => {
  try {
    // Vérifier si la description est un JSON (chaîne JSON)
    if (description.startsWith('[{') && description.endsWith('}]')) {
      const equipmentItems = JSON.parse(description);
      
      if (Array.isArray(equipmentItems) && equipmentItems.length > 0) {
        if (equipmentItems.length === 1) {
          // Si un seul élément, afficher simplement le titre
          return equipmentItems[0].title || "Votre équipement";
        } else {
          // Si plusieurs éléments, créer un résumé
          return `${equipmentItems.length} équipements dont ${equipmentItems[0].title}`;
        }
      }
    }
    
    // Si ce n'est pas un tableau JSON valide, renvoyer la description telle quelle
    return description;
  } catch (e) {
    console.log("Erreur lors du parsing de la description:", e);
    return description;
  }
};

/**
 * Utilitaire pour supprimer les balises HTML d'une chaîne
 */
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '');
};
