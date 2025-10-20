import { supabase } from "@/integrations/supabase/client";

/**
 * Envoie l'email de félicitations pour acceptation du leasing
 */
export const sendLeasingAcceptanceEmail = async (
  offerId: string,
  customContent?: string,
  includePdfAttachment: boolean = true
): Promise<boolean> => {
  try {
    console.log("📧 Envoi de l'email de félicitations pour acceptation du leasing");
    console.log("📧 Contenu personnalisé:", customContent ? "Oui" : "Non");
    console.log("📧 Inclure PDF:", includePdfAttachment);

    const { error } = await supabase.functions.invoke('send-leasing-acceptance-email', {
      body: { 
        offerId, 
        customContent, 
        includePdfAttachment 
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
  customContent?: string
): Promise<boolean> => {
  try {
    console.log("📧 Envoi de l'email de refus pour le leasing");
    console.log("📧 Titre personnalisé:", customTitle ? "Oui" : "Non");
    console.log("📧 Contenu personnalisé:", customContent ? "Oui" : "Non");

    const { error } = await supabase.functions.invoke('send-leasing-rejection-email', {
      body: { 
        offerId, 
        customTitle, 
        customContent 
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
 * Génère le template HTML par défaut de l'email
 */
export const getDefaultEmailTemplate = (
  clientFirstName: string,
  equipmentListHtml: string
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .equipment-list {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .equipment-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .celebration {
      text-align: center;
      font-size: 48px;
      margin: 20px 0;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .warning-title {
      font-weight: bold;
      color: #92400e;
      margin-bottom: 5px;
    }
    .divider {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🙌 Félicitations - Votre demande de leasing a été acceptée !</h1>
  </div>
  
  <div class="content">
    <p>Bonjour <strong>${clientFirstName}</strong>,</p>
    
    <p>Ce mail de confirmation pour vous annoncer que votre demande de leasing informatique concernant :</p>
    
    <div class="equipment-list">
      <ul>
        ${equipmentListHtml}
      </ul>
    </div>
    
    <div class="celebration">A ÉTÉ ACCEPTÉE 🎉</div>
    
    <hr class="divider">
    
    <p><strong>Prochaines étapes :</strong></p>
    
    <p>Dans quelques instants, vous allez recevoir le contrat de notre partenaire financier à signer de manière électronique.</p>
    
    <p>Dès réception de la signature du contrat, nous procéderons à la commande de matériel et nous vous contacterons pour définir une date de livraison (comptez 3 à 4 jours ouvrables pour la réception du matériel).</p>
    
    <div class="warning">
      <div class="warning-title">⚠️ Actions requises :</div>
      <p style="margin: 5px 0;">• Pouvez-vous nous envoyer la copie ou une photo lisible recto/verso de votre carte d'identité par retour de mail.</p>
      <p style="margin: 5px 0;">• Pouvez-vous également prendre connaissance des modalités de leasing ci-jointes, cela évitera tout malentendus.</p>
    </div>
    
    <p>N'hésitez pas à revenir vers nous si vous avez la moindre question.</p>
    
    <p>Bonne journée,</p>
    
    <p><strong>Cordialement,</strong><br>
    L'équipe iTakecare</p>
  </div>
  
  <div class="footer">
    <p>iTakecare SRL | BE0795.642.894<br>
    Avenue Général Michel 1E - 6000 Charleroi<br>
    <a href="https://www.itakecare.be">www.itakecare.be</a> | <a href="mailto:hello@itakecare.be">hello@itakecare.be</a></p>
  </div>
</body>
</html>
  `;
};
