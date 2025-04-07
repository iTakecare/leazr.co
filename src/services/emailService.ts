
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define email data interface to include the signatureLink
interface OfferEmailData {
  id: string;
  description: string;
  amount: number;
  monthlyPayment: number;
  signatureLink?: string;
}

/**
 * Sends an email to a client with their offer details and a signature link
 */
export const sendOfferReadyEmail = async (
  toEmail: string, 
  clientName: string, 
  offerData: OfferEmailData
): Promise<boolean> => {
  try {
    console.log("Tentative d'envoi d'email pour l'offre:", offerData.id);
    
    // In a real implementation, this would use a Supabase Edge Function
    // or another email service to send the actual email
    
    // Simulate email sending for demonstration
    console.log("Email virtuel envoyé à:", toEmail);
    console.log("Contenu de l'email:", {
      recipient: toEmail,
      clientName,
      offerDetails: offerData,
      signatureLink: offerData.signatureLink
    });
    
    // For now, we'll just return success
    // In a real implementation, you would check the response from the email service
    return true;
    
  } catch (error) {
    console.error("Error sending email:", error);
    toast.error("Erreur lors de l'envoi de l'email");
    return false;
  }
};

/**
 * Sends a welcome email to a new user
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string,
  userType: "partner" | "ambassador" | "client"
): Promise<boolean> => {
  try {
    console.log(`Envoi d'un email de bienvenue à ${name} (${email}) en tant que ${userType}`);
    
    // Determine the welcome message based on user type
    let userTypeLabel = userType === "partner" 
      ? "partenaire" 
      : userType === "ambassador" 
        ? "ambassadeur" 
        : "client";
    
    // In a real implementation, this would use a Supabase Edge Function
    // or another email service to send the actual email
    
    // Simulate email sending for demonstration
    console.log("Email virtuel envoyé à:", email);
    console.log("Contenu de l'email:", {
      recipient: email,
      subject: `Bienvenue sur ITakeCare, ${name}`,
      body: `
        <h1>Bienvenue sur ITakeCare!</h1>
        <p>Bonjour ${name},</p>
        <p>Nous sommes ravis de vous accueillir en tant que ${userTypeLabel} sur notre plateforme.</p>
        <p>Votre compte a été créé avec succès. Vous pouvez désormais vous connecter avec votre adresse email.</p>
        <p>Un email de réinitialisation de mot de passe vous a été envoyé pour définir votre mot de passe.</p>
        <p>À bientôt sur ITakeCare!</p>
      `
    });
    
    // For now, we'll just return success
    // In a real implementation, you would check the response from the email service
    return true;
    
  } catch (error) {
    console.error("Error sending welcome email:", error);
    toast.error("Erreur lors de l'envoi de l'email de bienvenue");
    return false;
  }
};
