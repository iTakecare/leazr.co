import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateOfferPdf } from "@/utils/pdfGenerator";

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
 * IMPORTANT: Cette fonction doit être accessible sans authentification
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    if (!offerId || offerId.trim() === "") {
      console.error("ID d'offre invalide ou vide");
      throw new Error("ID d'offre invalide ou manquant");
    }
    
    console.log("Début de récupération de l'offre pour le client. ID:", offerId);
    
    // Récupérer les détails de l'offre sans authentification
    // Note: Assurez-vous que la RLS est configurée pour permettre la lecture des offres par ID sans auth
    const { data: offerData, error: offerError } = await supabase
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
        remarks
      `)
      .eq('id', offerId)
      .maybeSingle();
      
    if (offerError) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      
      // Tentative avec la fonction RPC qui devrait être accessible sans auth
      console.log("Tentative avec la fonction RPC get_offer_by_id_public...");
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_offer_by_id_public', { offer_id: offerId });
        
      if (rpcError || !rpcData || rpcData.length === 0) {
        console.error("Échec de la récupération via RPC:", rpcError || "Pas de données");
        throw new Error(`Aucune offre trouvée avec l'ID: ${offerId}`);
      }
      
      console.log("Offre récupérée via RPC:", rpcData);
      return rpcData[0];
    }
    
    if (!offerData) {
      console.error("Aucune offre trouvée avec l'ID:", offerId);
      throw new Error(`Aucune offre trouvée avec l'ID: ${offerId}`);
    }
    
    console.log("Détails de l'offre récupérés avec succès:", {
      id: offerData.id,
      clientName: offerData.client_name
    });
    
    return offerData;
  } catch (error) {
    console.error("Erreur complète lors de la récupération de l'offre:", error);
    throw error;
  }
};

/**
 * Génère un lien de signature pour une offre
 * IMPORTANT: Ce lien doit pointer vers la page publique de signature
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return "";
  
  // Base URL de l'application
  const baseUrl = window.location.origin;
  // URL de signature publique (sans auth)
  return `${baseUrl}/client/sign-offer/${offerId}`;
};

/**
 * Génère et télécharge un PDF pour une offre
 */
export const generateAndDownloadOfferPdf = async (offerId: string) => {
  try {
    // Afficher un toast de chargement
    toast.info("Génération du PDF en cours...");
    
    // Récupérer les données de l'offre
    const offerData = await getOfferDataForPdf(offerId);
    
    if (!offerData) {
      toast.error("Impossible de récupérer les données de l'offre");
      return null;
    }
    
    console.log("Données récupérées pour le PDF:", {
      id: offerData.id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      amount: offerData.amount,
      monthly_payment: offerData.monthly_payment
    });
    
    // Générer le PDF
    const filename = await generateOfferPdf(offerData);
    
    toast.success(`PDF généré avec succès: ${filename}`);
    return filename;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    toast.error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return null;
  }
};

/**
 * Récupère une offre complète avec les données client pour générer un PDF
 */
export const getOfferDataForPdf = async (offerId: string) => {
  try {
    const supabaseClient = getSupabaseClient();
    
    console.log("Récupération des données de l'offre:", offerId);
    
    // Récupérer l'offre avec les données client associées
    const { data, error } = await supabaseClient
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
      .single();

    if (error) {
      console.error('Erreur lors de la récupération de l\'offre pour le PDF:', error);
      return null;
    }

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

    // Extraire et transformer les données client pour faciliter l'accès
    if (data && data.clients) {
      console.log("Client trouvé dans les données:", data.clients.name);
      
      // Ajouter directement les champs client_XXX pour compatibilité
      data.client_name = data.clients.name || data.client_name || "";
      data.client_email = data.clients.email || data.client_email || "";
      data.client_company = data.clients.company || "";
    } else {
      console.log("Aucune donnée client associée ou champs manquants");
    }
    
    // Assurer que tous les champs nécessaires ont une valeur par défaut
    if (data) {
      data.client_name = data.client_name || "Client sans nom";
      data.client_email = data.client_email || "";
      data.amount = data.amount || 0;
      data.monthly_payment = data.monthly_payment || 0;
      
      // S'assurer que la date est valide, sinon utiliser la date actuelle
      if (!data.created_at || isNaN(new Date(data.created_at).getTime())) {
        data.created_at = new Date().toISOString();
      }
      
      // Vérifier si offer_id est disponible
      if (!data.offer_id) {
        data.offer_id = `OFF-${offerId.substring(0, 8).toUpperCase()}`;
      }
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la préparation des données pour le PDF:', error);
    return null;
  }
};

// Utility function to get supabase client
const getSupabaseClient = () => {
  return supabase;
};
