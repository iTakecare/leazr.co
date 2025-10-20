import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Envoie un email de refus de leasing au client
 */
export async function sendLeasingRejectionEmail(
  offerId: string,
  customSubject?: string,
  customContent?: string
): Promise<boolean> {
  try {
    console.log("Envoi de l'email de refus pour l'offre:", offerId);

    const { data, error } = await supabase.functions.invoke(
      'send-leasing-rejection-email',
      {
        body: {
          offerId,
          customSubject,
          customContent,
        },
      }
    );

    if (error) {
      console.error("Erreur lors de l'envoi de l'email de refus:", error);
      toast.error("Erreur lors de l'envoi de l'email de refus");
      return false;
    }

    console.log("Email de refus envoyé avec succès:", data);
    return true;
  } catch (error) {
    console.error("Exception lors de l'envoi de l'email de refus:", error);
    toast.error("Erreur lors de l'envoi de l'email de refus");
    return false;
  }
}

/**
 * Génère le template par défaut de l'email de refus
 */
export function getDefaultRejectionEmailTemplate(companyName: string = "iTakecare"): string {
  return `<p>Bonjour,</p>
<p>Nous sommes désolés de vous apprendre que notre partenaire financier nous a indiqué qu'il ne pouvait pas donner suite à votre demande de leasing.</p>
<p>Nous ne pourrons donc pas vous proposer de matériel cette fois-ci.</p>
<p>Je vous souhaite tout le meilleur pour la suite de vos activités.</p>
<p>A bientôt,</p>
<p><strong>L'équipe ${companyName}</strong></p>`;
}
