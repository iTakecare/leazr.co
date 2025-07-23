
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateOfferPdf } from "@/utils/pdfGenerator";

const supabase = getSupabaseClient();

/**
 * Enregistre la signature d'une offre
 * @param offerId ID de l'offre
 * @param signatureData URL de données de la signature
 * @param signerName Nom du signataire
 * @param ipAddress Adresse IP du signataire (optionnelle)
 * @returns Succès de l'opération
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string,
  signerName: string,
  ipAddress?: string
): Promise<boolean> => {
  try {
    console.log("Début de l'enregistrement de la signature pour l'offre:", offerId);
    console.log("Taille des données de signature:", signatureData.length, "caractères");
    
    // Vérification de la validité de la signature
    if (!signatureData || !signatureData.startsWith('data:image/')) {
      console.error("Données de signature invalides");
      return false;
    }

    // Vérifier si l'utilisateur est authentifié
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Utilisateur non authentifié - utiliser la fonction RPC sécurisée pour les signatures publiques
      console.log("Signature publique - utilisation de la fonction RPC sécurisée");
      
      const { data, error } = await supabase.rpc('sign_offer_public', {
        p_offer_id: offerId,
        p_signature_data: signatureData,
        p_signer_name: signerName.trim(),
        p_signer_ip: ipAddress || null
      });

      if (error) {
        console.error("Erreur lors de la signature publique:", error);
        throw new Error(error.message);
      }

      console.log("Signature publique enregistrée avec succès pour l'offre:", offerId);
      return data === true;
    }

    // Utilisateur authentifié - utiliser le processus normal
    console.log("Signature d'utilisateur authentifié - processus normal");
    
    // Créer un timestamp ISO 8601 précis avec millisecondes pour la valeur légale
    const now = new Date().toISOString();
    
    // 1. Mettre à jour le statut de l'offre en "approved"
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        workflow_status: 'approved',
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: now,
        signer_ip: ipAddress || null // Stocker l'adresse IP du signataire
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
        user_id: user.id,
        previous_status: 'sent', // On suppose que l'offre était en statut "sent"
        new_status: 'approved',
        reason: `Offre signée électroniquement par ${signerName}${ipAddress ? ` depuis l'adresse IP ${ipAddress}` : ''}`
      });

    if (logError) {
      console.error("Erreur lors de l'ajout du log de workflow:", logError);
      // Ne pas bloquer le processus si l'ajout du log échoue
    }

    console.log("Signature enregistrée avec succès pour l'offre:", offerId);
    console.log("Timestamp précis:", now);
    console.log("Adresse IP du signataire:", ipAddress || "Non disponible");
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
 * Version simplifiée qui utilise la fonction RPC sécurisée
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    if (!offerId || offerId.trim() === "") {
      console.error("ID d'offre invalide ou vide");
      throw new Error("ID d'offre invalide ou manquant");
    }
    
    console.log("🔍 Récupération de l'offre pour le client. ID:", offerId);
    
    // Utiliser la fonction RPC publique pour récupérer l'offre
    const { data, error } = await supabase
      .rpc('get_offer_by_id_public', { offer_id: offerId });
      
    console.log("📊 Résultat de la requête RPC:", {
      success: !error, 
      hasData: !!data,
      dataLength: data ? data.length : 0,
      error: error?.message
    });

    if (error) {
      console.error("❌ Erreur lors de la récupération de l'offre via RPC:", error);
      throw new Error(`Erreur lors de la récupération de l'offre: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.error("❌ Aucune offre trouvée avec l'ID:", offerId);
      throw new Error(`Aucune offre trouvée avec l'ID: ${offerId}`);
    }
    
    const offerData = data[0];
    console.log("✅ Offre récupérée avec succès:", {
      id: offerData.id,
      clientName: offerData.client_name,
      hasMonthlyPayment: offerData.monthly_payment !== undefined && offerData.monthly_payment !== null,
      monthlyPayment: offerData.monthly_payment,
      workflowStatus: offerData.workflow_status
    });
    
    // Si client_id est présent, récupérer les détails du client
    if (offerData.client_id) {
      console.log("🔍 Récupération des détails du client associé...");
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('company, email, phone, address, city, postal_code, country')
          .eq('id', offerData.client_id)
          .maybeSingle();
          
        if (!clientError && clientData) {
          console.log("✅ Données client récupérées:", clientData);
          offerData.clients = clientData;
        } else {
          console.log("⚠️ Pas de données client supplémentaires:", clientError?.message);
        }
      } catch (clientErr) {
        console.log("⚠️ Erreur lors de la récupération du client, continuons sans:", clientErr);
      }
    }
    
    // Récupérer les équipements associés à l'offre
    console.log("🔍 Récupération des équipements pour l'offre...");
    try {
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('offer_equipment')
        .select(`
          *,
          attributes:offer_equipment_attributes(*),
          specifications:offer_equipment_specifications(*)
        `)
        .eq('offer_id', offerId);
        
      if (!equipmentError && equipmentData && equipmentData.length > 0) {
        console.log("✅ Équipements récupérés:", equipmentData);
        offerData.equipment_data = equipmentData;
        
        // Pour la compatibilité avec l'ancien format, convertir aussi en JSON
        try {
          const equipmentJson = equipmentData.map(eq => ({
            title: eq.title,
            purchasePrice: eq.purchase_price,
            quantity: eq.quantity,
            margin: eq.margin,
            monthlyPayment: eq.monthly_payment,
            serialNumber: eq.serial_number,
            attributes: eq.attributes ? eq.attributes.reduce((acc, attr) => {
              acc[attr.key] = attr.value;
              return acc;
            }, {}) : {},
            specifications: eq.specifications ? eq.specifications.reduce((acc, spec) => {
              acc[spec.key] = spec.value;
              return acc;
            }, {}) : {}
          }));
          offerData.equipment_description = JSON.stringify(equipmentJson);
          console.log("✅ Description d'équipement JSON créée pour compatibilité");
        } catch (jsonError) {
          console.error("⚠️ Erreur lors de la création du JSON de compatibilité:", jsonError);
        }
      } else {
        console.log("⚠️ Aucun équipement trouvé pour cette offre");
        if (equipmentError) {
          console.error("Erreur lors de la récupération des équipements:", equipmentError);
        }
      }
    } catch (equipmentErr) {
      console.log("⚠️ Erreur lors de la récupération des équipements, continuons sans:", equipmentErr);
    }
    
    return offerData;
  } catch (error) {
    console.error("❌ Erreur complète lors de la récupération de l'offre:", error);
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
  // URL de signature corrigée pour correspondre à la route définie dans App.tsx
  return `${baseUrl}/client/offer/${offerId}/sign`;
};

/**
 * Récupère une offre complète avec les données client pour générer un PDF
 */
export const getOfferDataForPdf = async (offerId: string) => {
  try {
    console.log("Récupération des données de l'offre:", offerId);
    
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
      console.error('Erreur lors de la récupération de l\'offre pour le PDF:', error);
      return null;
    }

    if (!data) {
      console.error("Aucune donnée d'offre trouvée pour l'ID:", offerId);
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
