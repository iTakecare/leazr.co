
// Add this if the file doesn't exist yet or update it if it does
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
