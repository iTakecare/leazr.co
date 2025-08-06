
import { getSupabaseClient } from "@/integrations/supabase/client";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { PDFTemplateService } from "../pdfTemplateService";
import HtmlTemplateService from "../htmlTemplateService";
import { saveAs } from "file-saver";


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
        // Vérifier si c'est déjà du JSON valide
        if (typeof data.equipment_description === 'string') {
          // Nettoyer le texte avant de tenter le parsing JSON
          let cleanDescription = data.equipment_description.trim();
          
          // Si ça commence par "Demande" ou du texte libre, créer un objet simple
          if (!cleanDescription.startsWith('[') && !cleanDescription.startsWith('{')) {
            console.log("Equipment description is plain text, converting to structured data");
            data.equipment_data = [{
              title: "Équipement",
              description: cleanDescription,
              purchasePrice: data.amount || 0,
              quantity: 1,
              margin: 20,
              monthlyPayment: data.monthly_payment || 0
            }];
          } else {
            // Essayer de parser comme JSON
            try {
              const equipmentData = JSON.parse(cleanDescription);
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
            } catch (jsonError) {
              console.log("Failed to parse equipment_description as JSON, using fallback");
              data.equipment_data = [{
                title: "Équipement",
                description: cleanDescription,
                purchasePrice: data.amount || 0,
                quantity: 1,
                margin: 20,
                monthlyPayment: data.monthly_payment || 0
              }];
            }
          }
        } else {
          // Les données sont déjà un objet
          data.equipment_data = data.equipment_description;
        }
      } catch (e) {
        console.error("Erreur lors du traitement des données d'équipement:", e);
        // Fallback vers une structure par défaut
        data.equipment_data = [{
          title: "Équipement",
          description: "Description non disponible",
          purchasePrice: data.amount || 0,
          quantity: 1,
          margin: 20,
          monthlyPayment: data.monthly_payment || 0
        }];
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


    // Vérifier d'abord s'il existe un template HTML pour cette entreprise
    let pdfOptions = {};
    
    if (offerData.company_id) {
      try {
        console.log("🔍 Vérification des templates HTML pour l'entreprise:", offerData.company_id);
        
        // D'abord chercher un template HTML dans html_templates
        const htmlTemplateService = HtmlTemplateService.getInstance();
        const htmlTemplates = await htmlTemplateService.loadCompanyTemplates(offerData.company_id);
        
        console.log("🔍 Templates HTML trouvés:", htmlTemplates.length);
        
        if (htmlTemplates.length > 0) {
          // Utiliser le premier template HTML par défaut ou celui marqué comme default
          const defaultTemplate = htmlTemplates.find(t => t.is_default) || htmlTemplates[0];
          
          console.log("✅ Template HTML trouvé - utilisation du template de la base de données");
          console.log("🔍 Template HTML details:", {
            id: defaultTemplate.id,
            name: defaultTemplate.name,
            is_default: defaultTemplate.is_default
          });
          
          pdfOptions = {
            useHtmlTemplate: true,
            customTemplate: defaultTemplate.html_content,
            templateData: {
              template_id: defaultTemplate.id,
              name: defaultTemplate.name
            }
          };
          
          console.log("🎯 Options PDF configurées pour template HTML de la DB:", pdfOptions);
        } else {
          // Fallback vers les anciens templates PDF
          console.log("🔍 Aucun template HTML trouvé, vérification des templates PDF...");
          const template = await PDFTemplateService.getTemplateForOffer(
            offerData.company_id,
            'standard',
            'offer'
          );
          
          if (template) {
            console.log("✅ Template PDF trouvé - utilisation du template PDF");
            pdfOptions = {
              useHtmlTemplate: true,
              customTemplate: null, // null force l'utilisation du template iTakecare par défaut
              templateData: template
            };
          } else {
            console.log("❌ Aucun template trouvé, utilisation du template React standard");
          }
        }
      } catch (error) {
        console.warn("⚠️ Erreur lors de la vérification des templates, utilisation du fallback:", error);
      }
    }
    
    // Générer le PDF avec les options appropriées
    const filename = await generateOfferPdf(offerData, pdfOptions);
    
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
