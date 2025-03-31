import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailTemplate {
  subject: string;
  body: string;
}

/**
 * Envoie un email en utilisant les paramètres SMTP configurés
 */
export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<boolean> => {
  try {
    console.log(`Tentative d'envoi d'email à ${to} avec sujet "${subject}"`);
    
    // Récupérer les paramètres SMTP
    const { data: smtpSettings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('id', 1)
      .single();
      
    if (settingsError || !smtpSettings || !smtpSettings.enabled) {
      console.error("Erreur ou paramètres SMTP non disponibles:", settingsError);
      return false;
    }
    
    // Appeler la fonction Supabase pour envoyer l'email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html: htmlContent,
        text: textContent || stripHtml(htmlContent),
        from: {
          email: smtpSettings.from_email,
          name: smtpSettings.from_name
        },
        smtp: {
          host: smtpSettings.host,
          port: parseInt(smtpSettings.port),
          username: smtpSettings.username,
          password: smtpSettings.password,
          secure: smtpSettings.secure
        }
      }
    });

    if (error) {
      console.error("Erreur lors de l'appel à la fonction d'envoi d'email:", error);
      return false;
    }
    
    // Vérifier la réponse
    if (data && data.success) {
      console.log("Email envoyé avec succès à:", to);
      return true;
    } else {
      console.error("Échec de l'envoi d'email:", data?.error || "Raison inconnue");
      return false;
    }
  } catch (error) {
    console.error("Exception lors de l'envoi de l'email:", error);
    return false;
  }
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
    
    const typeDisplay = 
      userType === "partner" ? "partenaire" : 
      userType === "ambassador" ? "ambassadeur" : 
      "client";
    
    const subject = `Bienvenue sur votre compte ${typeDisplay} iTakecare`;
    
    const html = `
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
    
    console.log(`Tentative d'envoi d'email de bienvenue à: ${email}`);
    
    const success = await sendEmail(
      email,
      subject,
      html
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
 * Génère un template d'email de bienvenue personnalisé selon le type d'utilisateur
 */
const getWelcomeEmailTemplate = (
  name: string, 
  userType: "client" | "partner" | "ambassador",
  isNewAccount: boolean
): EmailTemplate => {
  const portalLink = window.location.origin;
  const userTypeLabel = userType === "client" 
    ? "client" 
    : userType === "partner" 
      ? "partenaire" 
      : "ambassadeur";
  
  const subject = isNewAccount
    ? `Bienvenue sur iTakecare - Votre compte ${userTypeLabel} a été créé`
    : `iTakecare - Vos informations de connexion au portail ${userTypeLabel}`;
  
  const body = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: #ffffff; padding: 20px; border-radius: 5px; border: 1px solid #e9ecef; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #6c757d; }
        .button { display: inline-block; background-color: #007bff; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 20px 0; }
        .important { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>iTakecare</h1>
      </div>
      <div class="content">
        <h2>Bonjour ${name},</h2>
        
        ${isNewAccount 
          ? `<p>Nous sommes ravis de vous informer que votre compte ${userTypeLabel} a été créé avec succès sur notre plateforme iTakecare.</p>` 
          : `<p>Nous vous rappelons que vous disposez d'un accès au portail ${userTypeLabel} de notre plateforme iTakecare.</p>`
        }
        
        <p>Vous pouvez dès maintenant vous connecter à votre espace personnel en cliquant sur le lien ci-dessous :</p>
        
        <div style="text-align: center;">
          <a href="${portalLink}/login" class="button">Accéder à mon espace</a>
        </div>
        
        <p>Un email de réinitialisation de mot de passe vous a été envoyé séparément pour configurer votre mot de passe.</p>
        
        ${userType === "client" 
          ? `<p>Dans votre espace client, vous pourrez :</p>
            <ul>
              <li>Suivre l'avancement de vos demandes de financement</li>
              <li>Consulter vos contrats</li>
              <li>Communiquer avec notre équipe</li>
            </ul>` 
          : userType === "partner" 
            ? `<p>Dans votre espace partenaire, vous pourrez :</p>
              <ul>
                <li>Créer de nouvelles offres pour vos clients</li>
                <li>Suivre l'état de vos commissions</li>
                <li>Gérer vos informations</li>
              </ul>` 
            : `<p>Dans votre espace ambassadeur, vous pourrez :</p>
              <ul>
                <li>Suivre les activités de vos partenaires</li>
                <li>Consulter vos commissions</li>
                <li>Accéder à nos ressources</li>
              </ul>`
        }
        
        <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter notre équipe support.</p>
        
        <p>Cordialement,<br>L'équipe iTakecare</p>
      </div>
      <div class="footer">
        <p>Cet email a été envoyé par iTakecare. Veuillez ne pas répondre à cet email.</p>
      </div>
    </body>
    </html>
  `;
  
  return { subject, body };
};

/**
 * Utilitaire pour supprimer les balises HTML d'une chaîne
 */
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '');
};
