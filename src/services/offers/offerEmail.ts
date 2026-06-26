import { supabase } from "@/integrations/supabase/client";
import { buildAcceptanceHtml, normalizeCommLang, type CommLang } from "@/lib/leasingEmailContent";

/**
 * Envoie l'email de félicitations pour acceptation du leasing
 */
export const sendLeasingAcceptanceEmail = async (
  offerId: string,
  customContent?: string,
  includePdfAttachment: boolean = true,
  language?: string
): Promise<boolean> => {
  try {
    console.log("📧 Envoi de l'email de félicitations pour acceptation du leasing");
    console.log("📧 Contenu personnalisé:", customContent ? "Oui" : "Non");
    console.log("📧 Inclure PDF:", includePdfAttachment);

    const { error } = await supabase.functions.invoke('send-leasing-acceptance-email', {
      body: {
        offerId,
        customContent,
        includePdfAttachment,
        language
      }
    });

    if (error) {
      console.error("⚠️ Erreur lors de l'envoi de l'email:", error);
      throw error;
    }

    console.log("✅ Email de félicitations envoyé avec succès");
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    throw error;
  }
};

/**
 * Envoie l'email de refus du leasing
 */
export const sendLeasingRejectionEmail = async (
  offerId: string,
  customTitle?: string,
  customContent?: string,
  language?: string
): Promise<boolean> => {
  try {
    console.log("📧 Envoi de l'email de refus pour le leasing");
    console.log("📧 Titre personnalisé:", customTitle ? "Oui" : "Non");
    console.log("📧 Contenu personnalisé:", customContent ? "Oui" : "Non");

    const { error } = await supabase.functions.invoke('send-leasing-rejection-email', {
      body: {
        offerId,
        customTitle,
        customContent,
        language
      }
    });

    if (error) {
      console.error("⚠️ Erreur lors de l'envoi de l'email de refus:", error);
      throw error;
    }

    console.log("✅ Email de refus envoyé avec succès");
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de refus:", error);
    throw error;
  }
};

/**
 * Envoie l'email de clôture pour dossier sans suite (Score D)
 */
export const sendNoFollowUpEmail = async (
  offerId: string,
  customTitle?: string,
  customContent?: string,
  language?: string
): Promise<boolean> => {
  try {
    console.log("📧 Envoi de l'email de clôture pour dossier sans suite");
    console.log("📧 Titre personnalisé:", customTitle ? "Oui" : "Non");
    console.log("📧 Contenu personnalisé:", customContent ? "Oui" : "Non");

    const { error } = await supabase.functions.invoke('send-no-follow-up-email', {
      body: {
        offerId,
        customTitle,
        customContent,
        language
      }
    });

    if (error) {
      console.error("⚠️ Erreur lors de l'envoi de l'email de clôture:", error);
      throw error;
    }

    console.log("✅ Email de clôture envoyé avec succès");
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de clôture:", error);
    throw error;
  }
};

/**
 * Génère le template HTML par défaut de l'email d'acceptation, dans la langue de
 * communication du client (FR par défaut). Le contenu reste synchronisé avec
 * l'edge function via src/lib/leasingEmailContent.ts.
 */
export const getDefaultEmailTemplate = (
  clientFirstName: string,
  equipmentListHtml: string,
  language: CommLang | string = "fr"
): string => {
  return buildAcceptanceHtml(normalizeCommLang(language), clientFirstName, equipmentListHtml);
};
