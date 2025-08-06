import html2pdf from 'html2pdf.js';
import HtmlTemplateService, { convertOfferToTemplateData, HtmlTemplateData } from '@/services/htmlTemplateService';

/**
 * Options pour la génération PDF à partir de HTML
 */
export interface HtmlPdfOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: number | number[];
  quality?: number;
  scale?: number;
}

/**
 * Nettoie le HTML en supprimant les sections qui ne doivent pas apparaître dans le PDF
 */
const cleanHtmlForPdf = (html: string): string => {
  console.log('🧹 Nettoyage du HTML pour PDF...');
  console.log('HTML avant nettoyage (longueur):', html.length);
  
  // Supprimer complètement la section template-guide
  let cleanedHtml = html.replace(
    /<div[^>]*class[^>]*template-guide[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );
  
  // Supprimer les commentaires HTML
  cleanedHtml = cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
  
  // Vérifier si le HTML contient encore du texte brut au lieu de HTML rendu
  const hasRawHtml = cleanedHtml.includes('&lt;div') || cleanedHtml.includes('&gt;');
  if (hasRawHtml) {
    console.warn('⚠️ ATTENTION: Le HTML contient encore du code échappé');
    // Décoder les entités HTML échappées si nécessaire
    cleanedHtml = cleanedHtml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  }
  
  console.log('✅ HTML nettoyé (longueur finale):', cleanedHtml.length);
  
  return cleanedHtml;
};

/**
 * Génère un PDF simplifié en utilisant html2pdf avec remplacement de chaînes direct
 */
export const generateSimplePdf = async (
  htmlTemplate: string,
  offerData: any,
  options: HtmlPdfOptions = {}
): Promise<string> => {
  try {
    console.log("🚀 Génération PDF simplifiée - début");
    console.log("📄 Taille du template HTML:", htmlTemplate.length);
    console.log("📋 ID offre:", offerData.id);
    
    // Préparer les données pour le remplacement direct
    const templateData = prepareOfferDataForTemplate(offerData);
    console.log("✅ Données préparées:", Object.keys(templateData).length, "champs");
    
    // Remplacer les champs template par remplacement de chaîne direct
    let processedHtml = htmlTemplate;
    
    console.log("🔄 Remplacement des champs template...");
    for (const [key, value] of Object.entries(templateData)) {
      const placeholder = `{{${key}}}`;
      const stringValue = String(value || '');
      processedHtml = processedHtml.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), stringValue);
    }
    
    // Nettoyer le HTML pour supprimer le guide des templates
    const cleanedHtml = cleanHtmlForPdf(processedHtml);
    console.log("🧹 HTML nettoyé, taille finale:", cleanedHtml.length);
    
    // Configuration optimisée pour le template iTakecare 7 pages
    const pdfOptions = {
      margin: options.margin || [8, 8, 8, 8], // Marges en mm - ajustées pour le design
      filename: options.filename || `offre-${Date.now()}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: options.quality || 0.95 
      },
      html2canvas: { 
        scale: options.scale || 1.2, // Optimisé pour la qualité/performance
        useCORS: true,
        logging: false, // Désactivé pour une meilleure performance
        letterRendering: true,
        allowTaint: true,
        imageTimeout: 15000,
        width: 794, // Largeur A4 en pixels
        height: 1123, // Hauteur A4 en pixels 
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123,
        foreignObjectRendering: true, // Améliore le rendu des CSS complexes
        removeContainer: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: options.format || 'a4', 
        orientation: options.orientation || 'portrait',
        compress: true,
        precision: 16
      },
      pagebreak: { 
        mode: 'avoid-all', // Évite les coupures de page inattendues
        before: '.page',
        after: '.page:not(:last-child)',
        avoid: 'img, .value-card, .step-item'
      }
    };
    
    console.log("Configuration PDF optimisée:", pdfOptions);
    
    // Créer un conteneur temporaire avec styles spécifiques pour PDF
    const container = document.createElement('div');
    container.style.cssText = `
      width: 210mm;
      margin: 0;
      padding: 0;
      font-family: 'Montserrat', 'Segoe UI', sans-serif;
      background: white;
      color: #333;
      font-size: 14px;
      line-height: 1.6;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    `;
    
    container.innerHTML = cleanedHtml;
    console.log("Container créé avec le HTML nettoyé");
    
    // Précharger toutes les images et polices
    const preloadAssets = async () => {
      const images = container.querySelectorAll('img');
      const loadPromises = Array.from(images).map(img => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Continue même en cas d'erreur
          }
        });
      });
      
      // Précharger la police Montserrat
      const fontPromise = new Promise<void>((resolve) => {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => resolve());
        } else {
          setTimeout(() => resolve(), 1000); // Fallback
        }
      });
      
      await Promise.all([...loadPromises, fontPromise]);
    };
    
    // Ajouter temporairement au DOM et précharger les assets
    document.body.appendChild(container);
    
    try {
      // Attendre que tout soit prêt
      await preloadAssets();
      console.log("Assets préchargés");
      
      // Petite pause pour s'assurer que le rendu est stable
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Générer le PDF
      console.log("Génération du PDF en cours...");
      await html2pdf()
        .from(container)
        .set(pdfOptions)
        .save();
      
      console.log("PDF généré avec succès");
      return pdfOptions.filename;
    } finally {
      // Nettoyer le DOM
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};

/**
 * Prépare les données d'offre pour le remplacement dans le template
 */
const prepareOfferDataForTemplate = (offerData: any) => {
  console.log("📋 Préparation des données pour template:", offerData.id);
  
  // Extraire les données d'équipement
  let equipmentData = [];
  if (offerData.equipment_data && Array.isArray(offerData.equipment_data)) {
    equipmentData = offerData.equipment_data;
  } else if (offerData.equipment_description) {
    try {
      const parsed = JSON.parse(offerData.equipment_description);
      equipmentData = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      equipmentData = [{
        title: "Équipement",
        description: offerData.equipment_description,
        purchasePrice: offerData.amount || 0,
        quantity: 1
      }];
    }
  }

  // Calculer les totaux
  const totalAmount = equipmentData.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
  const totalMonthly = equipmentData.reduce((sum, item) => sum + (item.monthlyPayment || 0), 0);
  
  // Calculer les assurances (2% du montant total)
  const insuranceAmount = totalAmount * 0.02;
  const monthlyInsurance = insuranceAmount / 60; // Sur 60 mois

  // Préparer les logos clients en HTML simple
  const clientLogos = `
    <div class="client-logos">
      <img src="/api/placeholder/150/60" alt="Logo client" style="max-height: 60px; margin: 0 10px;" />
    </div>
  `;

  return {
    // Informations de base
    offer_id: offerData.offer_id || `OFF-${offerData.id?.substring(0, 8).toUpperCase()}`,
    client_name: offerData.client_name || offerData.clients?.name || "Client",
    client_company: offerData.client_company || offerData.clients?.company || "",
    client_email: offerData.client_email || offerData.clients?.email || "",
    client_phone: offerData.clients?.phone || "",
    client_address: offerData.clients?.address || "",
    client_city: offerData.clients?.city || "",
    client_postal_code: offerData.clients?.postal_code || "",
    
    // Dates formatées
    offer_date: new Date(offerData.created_at || Date.now()).toLocaleDateString('fr-FR'),
    
    // Montants formatés
    total_amount: totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
    monthly_payment: totalMonthly.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
    insurance_amount: insuranceAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
    monthly_insurance: monthlyInsurance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
    
    // HTML content
    client_logos: clientLogos,
    
    // Équipements en JSON pour usage avancé
    equipment_json: JSON.stringify(equipmentData),
    
    // Premier équipement pour compatibilité
    equipment_title: equipmentData[0]?.title || "Équipement",
    equipment_description: equipmentData[0]?.description || "",
    equipment_price: equipmentData[0]?.purchasePrice?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) || "0 €",
    
    // Images par défaut (base64 ou URLs)
    base64_image_cover: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzNlNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudGFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+Q292ZXI8L3RleHQ+PC9zdmc+",
    base64_image_vision: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwYzg1MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudGFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+VmlzaW9uPC90ZXh0Pjwvc3ZnPg==",
    base64_image_logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudGFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+TG9nbzwvdGV4dD48L3N2Zz4="
  };
};

/**
 * Générer un PDF d'offre iTakecare à partir des données d'offre
 */
export const generateItakecareOfferPdf = async (
  offerData: any,
  customTemplate?: string,
  options: HtmlPdfOptions = {}
): Promise<string> => {
  try {
    console.log("Génération PDF iTakecare pour l'offre:", offerData.id);
    console.log("Template personnalisé fourni:", !!customTemplate);
    
    // Le template personnalisé doit provenir de la base de données
    if (!customTemplate) {
      console.error("ERREUR CRITIQUE: Aucun template HTML fourni depuis la base de données");
      throw new Error("Template HTML requis depuis la base de données. Veuillez créer un template dans les paramètres.");
    }
    
    console.log("Utilisation du template de la base de données, longueur:", customTemplate.length);
    
    // Convertir les données d'offre au format template
    const templateData = convertOfferToTemplateData(offerData);
    console.log("Données template préparées:", Object.keys(templateData));
    
    // Utiliser le template de la base de données et le nettoyer
    const htmlTemplate = customTemplate;
    
    // Générer le nom de fichier
    const filename = options.filename || `offre-itakecare-${offerData.id?.substring(0, 8)}.pdf`;
    
    // Configuration optimisée pour le template iTakecare 7 pages
    const pdfConfig: HtmlPdfOptions = {
      ...options,
      filename,
      margin: [8, 8, 8, 8], // Marges ajustées pour le design
      quality: 0.95,
      scale: 1.2, // Optimisé pour qualité/performance
      format: 'a4',
      orientation: 'portrait'
    };
    
    console.log("Configuration PDF optimisée pour template 7 pages:", pdfConfig);
    
    // Générer le PDF avec la nouvelle méthode simplifiée
    return await generateSimplePdf(htmlTemplate, offerData, pdfConfig);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF iTakecare:", error);
    
    // Message d'erreur plus informatif pour l'utilisateur
    if (error instanceof Error && error.message.includes("Template HTML requis")) {
      throw new Error("Aucun template HTML trouvé. Veuillez créer un template dans Paramètres > Templates HTML.");
    }
    
    throw error;
  }
};

/**
 * Prévisualiser un template HTML dans une nouvelle fenêtre
 */
export const previewHtmlTemplate = async (htmlTemplate: string, companyId?: string): Promise<Window | null> => {
  try {
    const templateService = HtmlTemplateService.getInstance();
    
    // Utiliser les données réelles de l'entreprise ou données d'exemple
    const compiledHtml = await templateService.previewTemplate(htmlTemplate, companyId);
    
    // Ouvrir dans une nouvelle fenêtre
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(compiledHtml);
      previewWindow.document.close();
    }
    
    return previewWindow;
  } catch (error) {
    console.error("Erreur lors de la prévisualisation:", error);
    throw error;
  }
};

export default {
  generateSimplePdf,
  generateItakecareOfferPdf,
  previewHtmlTemplate
};