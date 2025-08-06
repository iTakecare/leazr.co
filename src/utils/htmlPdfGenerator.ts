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
  // Supprimer complètement la section template-guide
  const cleanedHtml = html.replace(
    /<div[^>]*class[^>]*template-guide[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );
  
  // Supprimer les commentaires HTML
  return cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
};

/**
 * Générer un PDF à partir d'un template HTML et de données
 */
export const generatePdfFromHtmlTemplate = async (
  htmlTemplate: string,
  data: HtmlTemplateData,
  options: HtmlPdfOptions = {}
): Promise<string> => {
  try {
    console.log("Début de la génération PDF à partir du template HTML");
    console.log("Taille du template HTML:", htmlTemplate.length);
    
    // Obtenir l'instance du service de template
    const templateService = HtmlTemplateService.getInstance();
    
    // Compiler le template avec les données
    console.log("Compilation du template avec les données...");
    const compiledHtml = templateService.compileTemplate(htmlTemplate, data);
    console.log("Template compilé, taille:", compiledHtml.length);
    
    // Nettoyer le HTML pour supprimer le guide des templates
    const cleanedHtml = cleanHtmlForPdf(compiledHtml);
    console.log("HTML nettoyé, taille finale:", cleanedHtml.length);
    
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
    
    // Générer le PDF avec le template de la base de données
    return await generatePdfFromHtmlTemplate(htmlTemplate, templateData, pdfConfig);
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
  generatePdfFromHtmlTemplate,
  generateItakecareOfferPdf,
  previewHtmlTemplate
};