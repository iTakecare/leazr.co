import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/services/emailService";

/**
 * Enregistre la signature d'une offre
 * @param offerId ID de l'offre
 * @param signatureData URL de données de la signature
 * @param signerName Nom du signataire
 * @returns Succès de l'opération
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string,
  signerName: string
): Promise<boolean> => {
  try {
    console.log("Début de l'enregistrement de la signature pour l'offre:", offerId);
    
    // 1. Mettre à jour le statut de l'offre en "approved"
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        workflow_status: 'approved',
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: new Date().toISOString()
      })
      .eq('id', offerId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour de l'offre:", updateError);
      throw updateError;
    }

    // 2. Ajouter une entrée dans les logs du workflow
    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        previous_status: 'sent', // On suppose que l'offre était en statut "sent"
        new_status: 'approved',
        user_id: null, // Signature par le client, pas par un utilisateur
        reason: `Offre signée électroniquement par ${signerName}`
      });

    if (logError) {
      console.error("Erreur lors de l'ajout du log de workflow:", logError);
      // Ne pas bloquer le processus si l'ajout du log échoue
    }

    console.log("Signature enregistrée avec succès pour l'offre:", offerId);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la signature:", error);
    return false;
  }
};

/**
 * Vérifie si une offre est déjà signée
 * @param offerId ID de l'offre
 * @returns True si l'offre est déjà signée
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    console.log("Vérification si l'offre est déjà signée:", offerId);
    
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, workflow_status')
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      console.error("Erreur lors de la vérification de signature:", error);
      throw error;
    }
    
    const isSigned = !!data?.signature_data || data?.workflow_status === 'approved';
    console.log("Résultat de la vérification de signature:", isSigned);
    
    return isSigned;
  } catch (error) {
    console.error("Erreur lors de la vérification de la signature:", error);
    return false;
  }
};

/**
 * Récupère les détails d'une offre par son ID public (pour le client)
 * Ne révèle que les informations nécessaires pour le client
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    console.log("Début de récupération de l'offre pour le client:", offerId);
    
    if (!offerId || offerId.trim() === "") {
      console.error("ID d'offre invalide:", offerId);
      throw new Error("ID d'offre invalide ou manquant");
    }
    
    // Vérifier d'abord si l'offre existe en faisant une requête simple
    const checkResult = await supabase
      .from('offers')
      .select('id')
      .eq('id', offerId)
      .maybeSingle();
    
    if (checkResult.error) {
      console.error("Erreur lors de la vérification de l'existence de l'offre:", checkResult.error);
      throw checkResult.error;
    }
    
    if (!checkResult.data) {
      console.error("Aucune offre trouvée avec l'ID:", offerId);
      throw new Error(`Aucune offre trouvée avec l'ID: ${offerId}`);
    }
    
    console.log("Offre trouvée, récupération des détails...");
    
    // Récupérer tous les détails nécessaires
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        client_name,
        client_email,
        equipment_description,
        amount,
        monthly_payment,
        coefficient,
        workflow_status,
        signature_data,
        signer_name,
        signed_at,
        remarks,
        clients (
          company
        )
      `)
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      console.error("Erreur Supabase détaillée lors de la récupération de l'offre:", error);
      throw error;
    }
    
    if (!data) {
      console.error("Données manquantes pour l'offre avec l'ID:", offerId);
      throw new Error(`Aucune donnée disponible pour l'offre: ${offerId}`);
    }
    
    console.log("Données récupérées avec succès pour l'offre:", offerId);
    console.log("Contenu de l'offre:", JSON.stringify({
      id: data.id,
      client_name: data.client_name,
      workflow_status: data.workflow_status,
      has_client_data: !!data.clients,
      equipment_description_type: typeof data.equipment_description
    }));
    
    return data;
  } catch (error) {
    console.error("Erreur complète lors de la récupération de l'offre:", error);
    throw error;
  }
};

/**
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return "";
  
  // Base URL de l'application
  const baseUrl = window.location.origin;
  // URL de signature
  return `${baseUrl}/client/sign-offer/${offerId}`;
};

/**
 * Envoie un email au client avec un lien pour signer l'offre en ligne
 * @param offerId ID de l'offre
 * @returns Succès de l'opération
 */
export const sendOfferSignatureEmail = async (offerId: string): Promise<boolean> => {
  try {
    console.log("Préparation de l'envoi de l'email de signature pour l'offre:", offerId);
    
    // 1. Récupérer les détails de l'offre
    const { data: offer, error } = await supabase
      .from('offers')
      .select('id, client_name, client_email, equipment_description, monthly_payment, workflow_status')
      .eq('id', offerId)
      .single();
      
    if (error) {
      console.error("Erreur lors de la récupération des détails de l'offre:", error);
      throw error;
    }
    
    if (!offer.client_email) {
      console.error("Email du client manquant pour l'offre:", offerId);
      throw new Error("L'email du client est requis pour envoyer l'invitation de signature");
    }
    
    // Vérifier si l'offre est déjà signée
    if (offer.workflow_status === 'approved') {
      console.log("L'offre a déjà été signée, pas d'email envoyé:", offerId);
      toast.info("Cette offre a déjà été signée");
      return false;
    }
    
    // 2. Mettre à jour le statut de l'offre à "sent" si elle est en "draft"
    if (offer.workflow_status === 'draft') {
      const { error: updateError } = await supabase
        .from('offers')
        .update({ workflow_status: 'sent' })
        .eq('id', offerId);
        
      if (updateError) {
        console.error("Erreur lors de la mise à jour du statut de l'offre:", updateError);
        // Continuer malgré l'erreur
      } else {
        console.log("Statut de l'offre mis à jour à 'sent'");
      }
    }
    
    // 3. Générer le lien de signature
    const signatureLink = generateSignatureLink(offerId);
    
    // 4. Formater la description de l'équipement pour l'affichage dans l'email
    let equipmentDescription = "Voir les détails dans le lien ci-dessous";
    if (offer.equipment_description) {
      try {
        if (typeof offer.equipment_description === 'string') {
          if (offer.equipment_description.startsWith('[')) {
            // C'est probablement un tableau JSON
            const equipmentArray = JSON.parse(offer.equipment_description);
            if (Array.isArray(equipmentArray) && equipmentArray.length > 0) {
              equipmentDescription = equipmentArray.map(item => 
                `${item.quantity || 1}x ${item.title || 'Équipement'}`
              ).join(', ');
            }
          } else {
            // Texte brut
            equipmentDescription = offer.equipment_description.substring(0, 100) + 
              (offer.equipment_description.length > 100 ? '...' : '');
          }
        }
      } catch (e) {
        console.error("Erreur lors du parsing de l'équipement pour l'email:", e);
      }
    }
    
    // 5. Préparer et envoyer l'email
    const subject = `Votre offre iTakecare est prête à être signée`;
    
    const html = `
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
          .highlight { font-weight: bold; color: #007bff; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          table, th, td { border: 1px solid #e9ecef; }
          th, td { padding: 10px; text-align: left; }
          th { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>iTakecare</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${offer.client_name},</h2>
          
          <p>Nous sommes ravis de vous annoncer que votre offre de financement est prête à être signée.</p>
          
          <p>Détails de votre offre :</p>
          <table>
            <tr>
              <th>Mensualité</th>
              <td class="highlight">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(offer.monthly_payment)}/mois</td>
            </tr>
            <tr>
              <th>Équipement</th>
              <td>${equipmentDescription}</td>
            </tr>
          </table>
          
          <p>Pour finaliser votre demande, veuillez cliquer sur le lien ci-dessous pour signer électroniquement votre offre :</p>
          
          <div style="text-align: center;">
            <a href="${signatureLink}" class="button">Signer mon offre</a>
          </div>
          
          <p>Le lien vous redirigera vers notre plateforme sécurisée où vous pourrez consulter tous les détails de l'offre avant de la signer.</p>
          
          <p>En cas de questions, n'hésitez pas à nous contacter directement en répondant à cet email.</p>
          
          <p>Cordialement,<br>L'équipe iTakecare</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé par iTakecare. Veuillez ne pas répondre à cet email automatique.</p>
        </div>
      </body>
      </html>
    `;
    
    const success = await sendEmail(
      offer.client_email,
      subject,
      html
    );
    
    if (success) {
      console.log("Email de signature envoyé avec succès à:", offer.client_email);
      toast.success("Email de signature envoyé avec succès");
      return true;
    } else {
      console.error("Échec de l'envoi de l'email de signature");
      toast.error("Échec de l'envoi de l'email de signature");
      return false;
    }
    
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de signature:", error);
    toast.error("Erreur lors de l'envoi de l'email de signature");
    return false;
  }
};
