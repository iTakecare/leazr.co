
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
    
    console.log("Récupération des données de l'offre:", offerId);
    
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

    console.log("Données d'offre récupérées:", data ? "Oui" : "Non");
    
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
        
        console.log("Données d'équipement pour le PDF:", 
          Array.isArray(data.equipment_data) ? 
            `${data.equipment_data.length} articles` : 
            "Format non reconnu");
      } catch (e) {
        console.error("Les données d'équipement ne sont pas un JSON valide:", e);
        console.log("Contenu brut:", data.equipment_description);
      }
    }

    // Extraire et transformer les données client pour faciliter l'accès dans le modèle PDF
    if (data && data.clients) {
      console.log("Client trouvé dans les données:", data.clients.name);
      
      // Ajouter directement les champs client_XXX pour compatibilité
      data.client_name = data.clients.name || data.client_name || "";
      data.client_first_name = data.clients.first_name || "";
      data.client_last_name = data.clients.last_name || "";
      data.client_email = data.clients.email || data.client_email || "";
      data.client_phone = data.clients.phone || "";
      data.client_company = data.clients.company || "";
      data.client_address = data.clients.address || "";
      data.client_postal_code = data.clients.postal_code || "";
      data.client_city = data.clients.city || "";
      data.client_vat_number = data.clients.vat_number || "";
    } else {
      console.log("Aucune donnée client associée ou champs manquants");
      console.log("client_name:", data?.client_name);
      console.log("client_email:", data?.client_email);
    }
    
    // Assurer que tous les champs nécessaires ont une valeur par défaut
    if (data) {
      data.client_name = data.client_name || "Client sans nom";
      data.client_first_name = data.client_first_name || "";
      data.client_email = data.client_email || "email@exemple.com";
      data.amount = data.amount || 0;
      data.monthly_payment = data.monthly_payment || 0;
      data.created_at = data.created_at || new Date().toISOString();
      
      // Vérifier si offer_id est disponible
      if (!data.offer_id) {
        data.offer_id = offerId.substring(0, 8).toUpperCase();
      }
      
      console.log("Données préparées pour le PDF:", {
        client_name: data.client_name,
        client_email: data.client_email,
        amount: data.amount,
        id: data.id,
        created_at: data.created_at
      });
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
    
    // S'assurer que le template a tous les champs nécessaires
    if (!template.templateImages || template.templateImages.length === 0) {
      console.warn("Aucune image de template n'a été définie");
    }
    
    // Préparer l'objet avec les données et le modèle
    const offerWithTemplate = {
      ...offerData,
      __template: {
        ...template,
        fields: Array.isArray(template.fields) ? template.fields : [],
        templateImages: Array.isArray(template.templateImages) ? template.templateImages : []
      }
    };
    
    // Vérifier que les images du template ont des données valides
    if (offerWithTemplate.__template.templateImages.length > 0) {
      offerWithTemplate.__template.templateImages.forEach((img, idx) => {
        console.log(`Image ${idx+1}: page ${img.page}, data: ${img.data ? 'présente' : 'absente'}, url: ${img.url ? 'présente' : 'absente'}`);
      });
    }
    
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

/**
 * Fonction simplifiée pour générer un PDF d'exemple avec des données
 */
export const generateSamplePdf = async (sampleData: any, template: any) => {
  try {
    console.log("Génération d'un PDF d'exemple");
    
    if (!sampleData) {
      console.error("Aucune donnée d'exemple fournie");
      throw new Error("Données d'exemple manquantes");
    }
    
    // Créer des données d'exemple enrichies avec des valeurs par défaut
    const completeSampleData = {
      id: sampleData.id || `preview-${Date.now()}`,
      client_name: sampleData.client_name || "Dupont",
      client_first_name: sampleData.client_first_name || "Jean",
      client_last_name: sampleData.client_last_name || "Dupont",
      client_email: sampleData.client_email || "jean.dupont@exemple.com", 
      client_phone: sampleData.client_phone || "0123456789",
      client_company: sampleData.client_company || "Entreprise Exemple",
      client_address: sampleData.client_address || "15 Rue de l'Exemple",
      client_postal_code: sampleData.client_postal_code || "75000",
      client_city: sampleData.client_city || "Paris",
      amount: sampleData.amount || 10000,
      monthly_payment: sampleData.monthly_payment || 300,
      created_at: sampleData.created_at || new Date().toISOString(),
      offer_id: sampleData.offer_id || `OFR-2023-001`,
      equipment_description: sampleData.equipment_description || JSON.stringify([
        {
          title: "MacBook Pro 16\" M2",
          purchasePrice: 2699, 
          quantity: 1,
          margin: 10
        },
        {
          title: "Écran Dell 27\" UltraHD",
          purchasePrice: 499, 
          quantity: 2,
          margin: 15
        }
      ]),
      ...sampleData // Conserver toutes les autres propriétés
    };
    
    // Afficher les données complètes pour déboguer
    console.log("Données d'exemple préparées:", {
      id: completeSampleData.id,
      client_name: completeSampleData.client_name,
      client_first_name: completeSampleData.client_first_name,
      client_email: completeSampleData.client_email,
      company: completeSampleData.client_company,
      offer_id: completeSampleData.offer_id
    });
    
    // Vérifier que le template est correctement défini
    if (!template) {
      console.error("Aucun modèle fourni pour la génération du PDF");
      throw new Error("Modèle PDF manquant");
    }
    
    // S'assurer que les tableaux sont correctement initialisés
    const completeTemplate = {
      ...template,
      templateImages: Array.isArray(template.templateImages) ? template.templateImages : [],
      fields: Array.isArray(template.fields) ? template.fields : []
    };
    
    // Vérifier les positions des champs
    if (completeTemplate.fields.length > 0) {
      // Afficher les champs pour déboguer
      console.log("Champs disponibles pour le PDF :", completeTemplate.fields.length);
      
      const fieldsWithPositions = completeTemplate.fields.filter(f => 
        f.position && typeof f.position.x === 'number' && typeof f.position.y === 'number'
      );
      
      console.log("Nombre de champs avec positions valides:", fieldsWithPositions.length);
      
      for (const field of fieldsWithPositions) {
        // Résoudre la valeur du champ pour le déboguer
        let fieldValue = field.value;
        if (typeof fieldValue === 'string' && fieldValue.includes('{')) {
          // Simple variable pattern replacement for debugging
          fieldValue = fieldValue.replace(/\{([^}]+)\}/g, (match, key) => {
            console.log(`Résolution de ${key} pour le pattern ${field.value}`);
            
            const value = completeSampleData[key];
            console.log(`Accès à ${key}: ${JSON.stringify(value)}`);
            
            if (value === undefined || value === null) {
              return "[Non disponible]";
            }
            return String(value);
          });
        }
        
        console.log(`Résolution du champ: ${field.label} ${field.value}`);
        console.log(`Valeur résolue: "${fieldValue}"`);
      }
    }
    
    // Fusionner les données et le template
    const dataWithTemplate = {
      ...completeSampleData,
      __template: completeTemplate
    };
    
    // Vérifier les images du template
    console.log("Images du template:");
    if (completeTemplate.templateImages.length > 0) {
      completeTemplate.templateImages.forEach((img, idx) => {
        console.log(`Image ${idx+1}: page ${img.page}, data: ${img.data ? 'présente' : 'absente'}, url: ${img.url ? 'présente' : 'absente'}`);
      });
    } else {
      console.warn("Aucune image de template n'a été définie");
    }
    
    // Générer le PDF avec les données complètes
    const filename = await generateOfferPdf(dataWithTemplate);
    
    console.log("PDF d'exemple généré:", filename);
    return filename;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF d'exemple:", error);
    throw error;
  }
};
