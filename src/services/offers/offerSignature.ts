
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Vérifie si une offre a déjà été signée
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    if (!offerId) return false;
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, workflow_status')
      .eq('id', offerId)
      .maybeSingle();
      
    if (error) {
      console.error("Erreur lors de la vérification de signature:", error);
      return false;
    }
    
    return !!data?.signature_data || data?.workflow_status === 'approved';
  } catch (error) {
    console.error("Erreur lors de la vérification de signature:", error);
    return false;
  }
};

/**
 * Récupère les données d'une offre pour un client
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    if (!offerId) {
      console.error("Identifiant d'offre manquant");
      return null;
    }
    
    const supabase = getSupabaseClient();
    
    console.log("Récupération des données de l'offre pour le client:", offerId);
    
    // Récupérer l'offre avec les données client associées
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (
          id, 
          name,
          email, 
          company,
          phone,
          address,
          postal_code,
          city,
          vat_number
        )
      `)
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la récupération de l\'offre pour le client:', error);
      return null;
    }

    if (!data) {
      console.error("Aucune donnée d'offre trouvée pour l'ID:", offerId);
      return null;
    }

    console.log("Données d'offre récupérées avec succès pour le client:", data.id);
    
    // Traiter les données d'équipement
    if (data && data.equipment_description) {
      try {
        // Parser les données d'équipement
        const equipmentData = typeof data.equipment_description === 'string' 
          ? JSON.parse(data.equipment_description)
          : data.equipment_description;
        
        // Conversion explicite des types numériques
        if (Array.isArray(equipmentData)) {
          data.equipment_data = equipmentData.map(item => ({
            ...item,
            purchasePrice: parseFloat(item.purchasePrice) || 0,
            quantity: parseInt(item.quantity, 10) || 1,
            margin: parseFloat(item.margin) || 20,
            monthlyPayment: parseFloat(item.monthlyPayment || 0)
          }));
        } else {
          data.equipment_data = equipmentData;
        }
      } catch (e) {
        console.error("Les données d'équipement ne sont pas un JSON valide:", e);
        console.log("Contenu brut:", data.equipment_description);
      }
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'offre pour le client:', error);
    return null;
  }
};

/**
 * Enregistre la signature d'une offre
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string,
  signerName: string
): Promise<boolean> => {
  try {
    if (!offerId || !signatureData) {
      console.error("Paramètres manquants pour l'enregistrement de la signature");
      return false;
    }
    
    const supabase = getSupabaseClient();
    
    console.log(`Enregistrement de la signature pour l'offre ${offerId}`);
    console.log(`Données de signature reçues (longueur): ${signatureData.length}`);
    console.log(`Nom du signataire: ${signerName}`);
    
    // Vérifier que la signature n'est pas vide ou juste un fond blanc
    if (signatureData.length < 1000) {
      console.error("Données de signature potentiellement invalides (trop courtes)");
      return false;
    }
    
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('offers')
      .update({
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: now,
        workflow_status: 'approved',
        previous_status: 'sent' // Conserver l'état précédent pour référence
      })
      .eq('id', offerId)
      .select('id, signature_data');
      
    if (error) {
      console.error("Erreur lors de l'enregistrement de la signature:", error);
      return false;
    }
    
    // Vérifier que les données de signature ont bien été enregistrées
    if (!data || data.length === 0 || !data[0].signature_data) {
      console.error("Données de signature non enregistrées correctement");
      return false;
    }
    
    console.log("Signature enregistrée avec succès pour l'offre:", offerId);
    
    // Ajouter une entrée dans le journal des événements si nécessaire
    try {
      await supabase
        .from('offer_workflow_logs')
        .insert({
          offer_id: offerId,
          from_status: 'sent',
          to_status: 'approved',
          log_message: `Offre signée par ${signerName}`,
          created_at: now
        });
    } catch (logError) {
      console.error("Erreur lors de l'enregistrement du journal:", logError);
      // Ne pas bloquer le processus si l'enregistrement du journal échoue
    }
    
    return true;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la signature:", error);
    return false;
  }
};

/**
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return '';
  
  // Générer le lien sur l'URL actuelle
  const baseUrl = window.location.origin;
  return `${baseUrl}/client/sign/${offerId}`;
};
