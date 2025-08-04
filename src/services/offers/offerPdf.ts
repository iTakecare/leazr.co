
import { getSupabaseClient } from "@/integrations/supabase/client";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { PDFGenerationEngine } from "../pdfGenerationEngine";
import { PDFTemplateService } from "../pdfTemplateService";
import { saveAs } from "file-saver";
import { getActiveTemplateByClient } from "../customPdfTemplateService";
import { CustomPdfRenderer } from "../customPdfRenderer";
import { CustomPdfTemplateAdapter } from "../customPdfTemplateAdapter";

/**
 * Récupère une offre complète avec les données client pour générer un PDF
 */
export const getOfferDataForPdf = async (offerId: string) => {
  try {
    if (!offerId) {
      console.error("ID d'offre manquant pour la récupération des données PDF");
      return null;
    }
    
    const supabase = getSupabaseClient();
    
    console.log("Récupération des données de l'offre pour PDF:", offerId);
    
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

    console.log("Données d'offre récupérées avec succès:", data.id);
    
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

/**
 * Génère et télécharge un PDF pour une offre avec le nouveau système de templates
 */
export const generateAndDownloadOfferPdf = async (
  offerId: string, 
  options?: {
    templateType?: string;
    templateId?: string;
    useNewEngine?: boolean;
  }
) => {
  if (!offerId) {
    console.error("ID d'offre manquant pour la génération du PDF");
    toast.error("Impossible de générer le PDF: identifiant d'offre manquant");
    return null;
  }
  
  try {
    // Afficher un toast de chargement
    toast.info("Génération du PDF en cours...");
    
    console.log(`Début de la génération du PDF pour l'offre: ${offerId}`);
    
    // Récupérer les données de l'offre
    const offerData = await getOfferDataForPdf(offerId);
    
    if (!offerData) {
      console.error(`Aucune donnée récupérée pour l'offre: ${offerId}`);
      toast.error("Impossible de récupérer les données de l'offre");
      return null;
    }
    
    console.log("Données récupérées pour le PDF:", {
      id: offerData.id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      amount: offerData.amount,
      monthly_payment: offerData.monthly_payment,
      company_id: offerData.company_id,
      client_id: offerData.client_id
    });

    // Vérifier s'il existe un template personnalisé pour ce client
    if (offerData.client_id && offerData.company_id) {
      try {
        console.log("Vérification des templates personnalisés pour le client:", offerData.client_id);
        const customTemplate = await getActiveTemplateByClient(offerData.client_id);
        
        if (customTemplate) {
          console.log("Template personnalisé trouvé:", customTemplate.name);
          
          // Convertir vers le format étendu pour le rendu
          const extendedTemplate = CustomPdfTemplateAdapter.toExtended(customTemplate);
          
          // Générer le PDF avec le template personnalisé
          const pdfBytes = await CustomPdfRenderer.renderCustomPdf(extendedTemplate, offerData);
          
          // Télécharger le PDF
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const filename = `offre-${offerData.offer_id || offerId}.pdf`;
          saveAs(blob, filename);
          
          console.log("PDF généré avec template personnalisé et téléchargé avec succès");
          toast.success(`PDF généré avec votre template personnalisé: ${filename}`);
          return filename;
        } else {
          console.log("Aucun template personnalisé actif pour ce client");
        }
      } catch (customError) {
        console.warn("Erreur avec le template personnalisé, fallback vers le système standard:", customError);
        toast.warning("Utilisation du template standard suite à une erreur");
      }
    }

    // Utiliser le nouveau moteur si demandé et si un company_id est disponible
    if (options?.useNewEngine && offerData.company_id) {
      try {
        console.log("Utilisation du nouveau moteur de génération PDF");
        
        const pdfUrl = await pdfGenerationEngine.generateOfferPDF(offerData);

        // Créer un blob et télécharger
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const filename = `offre-${offerData.offer_id || offerId}.pdf`;
        saveAs(blob, filename);
        
        console.log("PDF généré avec le nouveau moteur et téléchargé avec succès");
        toast.success(`PDF généré avec succès: ${filename}`);
        return filename;
      } catch (engineError) {
        console.warn("Erreur avec le nouveau moteur, fallback vers l'ancien:", engineError);
        toast.warning("Utilisation du système classique suite à une erreur");
        // Continuer avec l'ancien système en cas d'erreur
      }
    }

    // Ancien système (fallback ou par défaut)
    console.log("Utilisation de l'ancien système de génération PDF");
    
    // Générer le PDF avec l'ancien système
    const filename = await generateOfferPdf(offerData);
    
    if (!filename) {
      toast.error("Erreur lors de la génération du PDF");
      return null;
    }
    
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
export const generateSamplePdf = async (sampleData: any) => {
  try {
    console.log("=== DÉBUT GÉNÉRATION PDF D'EXEMPLE ===");
    
    if (!sampleData) {
      console.error("ERREUR: Aucune donnée d'exemple fournie");
      throw new Error("Données d'exemple manquantes");
    }
    
    // Créer des données d'exemple enrichies avec des valeurs par défaut pour leasing
    const completeSampleData = {
      id: sampleData.id || `preview-${Date.now()}`,
      offer_id: sampleData.offer_id || `OFF-DB7229E1`,
      client_name: sampleData.client_name || "Guy Tarre",
      client_company: sampleData.client_company || "ACME BELGIUM SA",
      client_email: sampleData.client_email || "mistergi118+client1@gmail.com", 
      amount: sampleData.amount || 10000,
      monthly_payment: sampleData.monthly_payment || 90,
      created_at: sampleData.created_at || new Date("2025-03-21").toISOString(),
      equipment_description: sampleData.equipment_description || JSON.stringify([
        {
          title: "Produit Test",
          purchasePrice: 2000, 
          quantity: 1,
          margin: 10,
          monthlyPayment: 90.00
        }
      ]),
      ...sampleData // Conserver toutes les autres propriétés
    };
    
    console.log("=== LANCEMENT DE LA GÉNÉRATION PDF ===");
    
    // Générer le PDF avec les données complètes
    const filename = await generateOfferPdf(completeSampleData);
    
    console.log("=== PDF GÉNÉRÉ AVEC SUCCÈS ===");
    console.log("Nom du fichier:", filename);
    return filename;
  } catch (error) {
    console.error("=== ERREUR LORS DE LA GÉNÉRATION DU PDF ===", error);
    throw error;
  }
};
