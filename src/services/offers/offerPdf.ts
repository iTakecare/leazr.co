
import { getSupabaseClient } from "@/integrations/supabase/client";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { PDFTemplateService } from "../pdfTemplateService";
import HtmlTemplateService, { convertOfferToTemplateData } from "../htmlTemplateService";
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
    
    // Récupérer l'offre avec les données client et équipements avec informations de livraison
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

    // Récupérer les équipements avec leurs informations de livraison pour le PDF
    console.log("Récupération des équipements avec informations de livraison pour le PDF");
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select(`
        *,
        attributes:offer_equipment_attributes(key, value),
        specifications:offer_equipment_specifications(key, value),
        collaborator:collaborators(id, name, email, phone),
        delivery_site:client_delivery_sites(
          site_name, 
          address, 
          city, 
          postal_code, 
          country,
          contact_name,
          contact_email,
          contact_phone
        )
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });

    if (equipmentError) {
      console.error("Erreur lors de la récupération des équipements pour PDF:", equipmentError);
      // Ne pas faire échouer si pas d'équipements, juste utiliser les données JSON existantes
    }

    // Si nous avons des données dans offer_equipment, les traiter avec les informations de livraison
    if (equipmentData && equipmentData.length > 0) {
      console.log("Traitement des équipements avec informations de livraison...");
      
      // Enrichir les équipements avec les informations de livraison formatées
      const enrichedEquipment = equipmentData.map(equipment => ({
        title: equipment.title,
        quantity: equipment.quantity,
        monthlyPayment: equipment.monthly_payment,
        purchasePrice: equipment.purchase_price,
        delivery_info: {
          type: equipment.delivery_type,
          collaborator: equipment.collaborator,
          site: equipment.delivery_site,
          specific_address: equipment.delivery_type === 'specific_address' ? {
            address: equipment.delivery_address,
            city: equipment.delivery_city,
            postal_code: equipment.delivery_postal_code,
            country: equipment.delivery_country,
            contact_name: equipment.delivery_contact_name,
            contact_email: equipment.delivery_contact_email,
            contact_phone: equipment.delivery_contact_phone
          } : null
        }
      }));

      data.equipment_data_enhanced = enrichedEquipment;
      console.log("Équipements enrichis avec informations de livraison");
    }

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
 * Génère et affiche un aperçu HTML de l'offre en utilisant le template HTML par défaut de l'entreprise
 */
export const generateOfferFromHtmlTemplate = async (offerId: string) => {
  if (!offerId) {
    console.error("ID d'offre manquant pour la génération HTML");
    toast.error("Impossible de générer l'offre: identifiant manquant");
    return null;
  }
  
  try {
    console.log(`🎨 Génération d'aperçu HTML pour: ${offerId}`);
    toast.info("Préparation de l'aperçu de l'offre...");
    
    // 1. Récupérer les données de l'offre
    const offerData = await getOfferDataForPdf(offerId);
    
    if (!offerData) {
      console.error(`Aucune donnée récupérée pour l'offre: ${offerId}`);
      toast.error("Impossible de récupérer les données de l'offre");
      return null;
    }
    
    // 2. Vérifier le company_id
    if (!offerData.company_id) {
      console.error("Company ID manquant dans les données de l'offre");
      toast.error("Données d'entreprise manquantes");
      return null;
    }
    
    console.log("📋 Données offre récupérées:", {
      id: offerData.id,
      company_id: offerData.company_id,
      client_name: offerData.client_name
    });
    
    // 3. Charger les templates HTML de l'entreprise
    const htmlTemplateService = HtmlTemplateService.getInstance();
    let htmlTemplates;
    
    try {
      htmlTemplates = await htmlTemplateService.loadCompanyTemplates(offerData.company_id);
      console.log(`📚 Templates HTML trouvés: ${htmlTemplates.length}`);
    } catch (error) {
      console.error("Erreur lors du chargement des templates:", error);
      toast.error("Impossible de charger les templates de l'entreprise");
      return null;
    }
    
    // 4. Vérifier qu'il existe au moins un template
    if (!htmlTemplates || htmlTemplates.length === 0) {
      console.error("Aucun template HTML configuré pour cette entreprise");
      toast.error("Aucun template HTML configuré pour cette entreprise");
      return null;
    }
    
    // 5. Sélectionner le template par défaut
    const defaultTemplate = htmlTemplates.find(t => t.is_default) || htmlTemplates[0];
    console.log("✅ Template sélectionné:", {
      id: defaultTemplate.id,
      name: defaultTemplate.name,
      is_default: defaultTemplate.is_default
    });
    
    // 6. Convertir les données de l'offre au format template
    const templateData = convertOfferToTemplateData(offerData);
    console.log("📊 Données converties pour le template");
    
    // 7. Compiler le template avec Handlebars
    let compiledHtml;
    try {
      compiledHtml = htmlTemplateService.compileTemplate(
        defaultTemplate.html_content,
        templateData
      );
      console.log("✅ Template compilé avec succès");
    } catch (error) {
      console.error("Erreur lors de la compilation du template:", error);
      toast.error("Erreur lors de la compilation du template");
      return null;
    }
    
    // 8. Afficher le HTML dans une nouvelle fenêtre
    const previewWindow = window.open('', '_blank');
    
    if (!previewWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'aperçu. Vérifiez que les popups ne sont pas bloquées.");
      return null;
    }
    
    // Créer un document HTML complet avec les styles nécessaires
    const fullHtmlDocument = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aperçu Offre - ${offerData.client_name || 'Client'}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #f8fafc;
            padding: 20px;
          }
          .preview-header {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .preview-header h1 {
            font-size: 24px;
            font-weight: 600;
            color: #0f172a;
          }
          .preview-actions {
            display: flex;
            gap: 10px;
          }
          .preview-actions button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-primary {
            background: #3b82f6;
            color: white;
          }
          .btn-primary:hover {
            background: #2563eb;
          }
          .btn-secondary {
            background: #e2e8f0;
            color: #475569;
          }
          .btn-secondary:hover {
            background: #cbd5e1;
          }
          .btn-success {
            background: #10b981;
            color: white;
          }
          .btn-success:hover {
            background: #059669;
          }
          
          /* Styles pour l'impression */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .preview-header {
              display: none !important;
            }
            
            .preview-content {
              padding: 0;
              box-shadow: none;
              max-width: 100%;
            }
            
            /* Forcer les sauts de page aux bons endroits */
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            
            /* Éviter les sauts de page dans les sections importantes */
            table, .equipment-section, .summary-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Optimiser les marges pour A4 */
            @page {
              size: A4;
              margin: 15mm 15mm 15mm 15mm;
            }
          }
          
          .preview-content {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            max-width: 210mm;
            margin: 0 auto;
            min-height: 297mm;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .preview-header {
              display: none;
            }
            .preview-content {
              box-shadow: none;
              padding: 0;
              max-width: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="preview-header">
          <h1>📄 Aperçu de l'offre</h1>
          <div class="preview-actions">
            <button class="btn-success" onclick="downloadAsPdf()">
              💾 Télécharger PDF
            </button>
            <button class="btn-secondary" onclick="window.print()">
              🖨️ Imprimer
            </button>
            <button class="btn-primary" onclick="window.close()">
              ✕ Fermer
            </button>
          </div>
        </div>
        <div class="preview-content">
          ${compiledHtml}
        </div>
        
        <script>
          async function downloadAsPdf() {
            const content = document.querySelector('.preview-content');
            const clientName = '${(offerData.client_name || 'Client').replace(/'/g, "\\'")}';
            const filename = \`offre-\${clientName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf\`;
            
            // Ajouter classe au body AVANT de masquer le header
            document.body.classList.add('generating-pdf');
            content.classList.add('pdf-ready');
            
            // Masquer temporairement le header
            const header = document.querySelector('.preview-header');
            const originalHeaderDisplay = header ? header.style.display : '';
            if (header) header.style.display = 'none';
            
            const opt = {
              margin: [5, 5, 5, 5],
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                imageTimeout: 15000,
                allowTaint: true
              },
              jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true,
                precision: 16
              },
              pagebreak: { mode: 'avoid-all' }
            };
            
            try {
              await html2pdf().set(opt).from(content).save();
              
              // Restaurer l'état
              document.body.classList.remove('generating-pdf');
              content.classList.remove('pdf-ready');
              if (header) header.style.display = originalHeaderDisplay;
              
              alert('✅ PDF téléchargé avec succès !');
            } catch (error) {
              console.error('Erreur lors de la génération du PDF:', error);
              
              // Restaurer l'état même en cas d'erreur
              document.body.classList.remove('generating-pdf');
              content.classList.remove('pdf-ready');
              if (header) header.style.display = originalHeaderDisplay;
              
              alert('❌ Erreur lors de la génération du PDF. Veuillez utiliser "Imprimer > Enregistrer en PDF" comme alternative.');
            }
          }
        </script>
      </body>
      </html>
    `;
    
    previewWindow.document.write(fullHtmlDocument);
    previewWindow.document.close();
    
    console.log("✅ Aperçu ouvert dans une nouvelle fenêtre");
    toast.success("Aperçu de l'offre ouvert dans une nouvelle fenêtre");
    
    return true;
  } catch (error) {
    console.error("Erreur générale lors de la génération de l'offre:", error);
    toast.error(`Erreur lors de la génération de l'offre: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
