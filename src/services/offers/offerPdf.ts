
import { getSupabaseClient } from "@/integrations/supabase/client";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { loadTemplate } from "@/utils/templateManager";
import { toast } from "sonner";

/**
 * Récupère une offre complète avec les données client pour générer un PDF
 */
export const getOfferDataForPdf = async (offerId: string) => {
  try {
    const supabase = getSupabaseClient();
    
    // Récupérer l'offre avec les données client associées
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (
          id, 
          name, 
          first_name,
          last_name,
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
        
        console.log("Données d'équipement pour le PDF:", data.equipment_data);
      } catch (e) {
        console.error("Les données d'équipement ne sont pas un JSON valide:", data.equipment_description);
      }
    }

    // Extraire et transformer les données client pour faciliter l'accès dans le modèle PDF
    if (data && data.clients) {
      // Ajouter directement les champs client_XXX pour compatibilité
      data.client_name = data.clients.name || data.client_name;
      data.client_first_name = data.clients.first_name || "";
      data.client_last_name = data.clients.last_name || "";
      data.client_email = data.clients.email || data.client_email;
      data.client_phone = data.clients.phone || "";
      data.client_company = data.clients.company || "";
      data.client_address = data.clients.address || "";
      data.client_postal_code = data.clients.postal_code || "";
      data.client_city = data.clients.city || "";
      data.client_vat_number = data.clients.vat_number || "";
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la préparation des données pour le PDF:', error);
    return null;
  }
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
      client_first_name: offerData.client_first_name,
      client_email: offerData.client_email,
      amount: offerData.amount,
      monthly_payment: offerData.monthly_payment
    });
    
    // Charger le modèle PDF
    const template = await loadTemplate();
    
    if (!template) {
      toast.error("Impossible de charger le modèle PDF");
      return null;
    }
    
    console.log("Modèle PDF chargé:", {
      nom: template.name,
      nbChamps: template.fields?.length || 0,
      nbImages: template.templateImages?.length || 0
    });
    
    // Vérifier que les champs ont des positions valides
    if (template.fields && template.fields.length > 0) {
      const fieldsWithValidPositions = template.fields.filter(f => 
        f.position && typeof f.position.x === 'number' && typeof f.position.y === 'number'
      );
      
      console.log(`${fieldsWithValidPositions.length} champs sur ${template.fields.length} ont des positions valides`);
      
      // Vérifier quelques champs pour le débogage
      if (fieldsWithValidPositions.length > 0) {
        console.log("Exemples de champs:", fieldsWithValidPositions.slice(0, 3).map(f => ({
          id: f.id,
          label: f.label,
          value: f.value,
          position: f.position
        })));
      }
    }
    
    // Préparer l'objet avec les données et le modèle
    const offerWithTemplate = {
      ...offerData,
      __template: template
    };
    
    // Générer le PDF
    const filename = await generateOfferPdf(offerWithTemplate);
    
    toast.success(`PDF généré avec succès: ${filename}`);
    return filename;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    toast.error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return null;
  }
};
