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
  console.log('🔍 HTML avant nettoyage (longueur):', html.length);
  const originalLength = html.length;
  
  // Remove template-guide sections more carefully - multiple variations
  let cleanedHtml = html
    .replace(/<div[^>]*class="[^"]*template-guide[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<section[^>]*class="[^"]*template-guide[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '')
    .replace(/<div[^>]*template-guide[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Remove HTML comments
  cleanedHtml = cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
  
  // Check if HTML is escaped and decode if necessary
  const hasRawHtml = cleanedHtml.includes('&lt;') || cleanedHtml.includes('&gt;');
  if (hasRawHtml) {
    console.warn('⚠️ ATTENTION: Le HTML contient du code échappé, décodage...');
    cleanedHtml = cleanedHtml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }
  
  const finalLength = cleanedHtml.length;
  console.log(`✅ HTML cleaned: ${originalLength} -> ${finalLength} characters (${originalLength - finalLength} removed)`);
  
  // Warning if too much content was removed
  if (finalLength < originalLength * 0.3) {
    console.warn('⚠️ WARNING: More than 70% of HTML was removed during cleaning!');
  }
  
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
    
    // Analyser le template pour identifier le type de placeholders utilisés
    console.log("🔍 Analyse du template HTML...");
    const placeholders = htmlTemplate.match(/\{\{[^}]+\}\}/g) || [];
    console.log("🎯 Placeholders trouvés:", placeholders.slice(0, 10)); // Afficher les 10 premiers
    
    let processedHtml = htmlTemplate;
    
    // Si le template contient des constructions Handlebars, utiliser le service approprié
    if (placeholders.length > 0 && placeholders.some((p: string) => p.includes('#') || p.includes('/'))) {
      console.log("🔧 Template Handlebars détecté, utilisation du service...");
      
      try {
        const { HtmlTemplateService, convertOfferToTemplateData } = await import('@/services/htmlTemplateService');
        const templateService = HtmlTemplateService.getInstance();
        const handlebarsData = convertOfferToTemplateData(offerData);
        
        console.log("📋 Données Handlebars préparées:", Object.keys(handlebarsData));
        processedHtml = templateService.compileTemplate(htmlTemplate, handlebarsData);
        console.log("✅ Template compilé avec Handlebars");
      } catch (error) {
        console.error("❌ Erreur Handlebars, fallback vers remplacement simple:", error);
        processedHtml = performSimpleReplacement(htmlTemplate, templateData);
      }
    } else {
      console.log("🔄 Template simple détecté, remplacement direct...");
      processedHtml = performSimpleReplacement(htmlTemplate, templateData);
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

// Fonction helper pour remplacement simple
const performSimpleReplacement = (htmlTemplate: string, templateData: Record<string, any>): string => {
  let processedHtml = htmlTemplate;
  let replacementCount = 0;
  
  for (const [key, value] of Object.entries(templateData)) {
    const placeholder = `{{${key}}}`;
    const stringValue = String(value || '');
    const beforeLength = processedHtml.length;
    
    processedHtml = processedHtml.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), stringValue);
    
    if (processedHtml.length !== beforeLength) {
      replacementCount++;
      console.log(`✅ Remplacé ${placeholder} -> ${stringValue.substring(0, 50)}${stringValue.length > 50 ? '...' : ''}`);
    }
  }
  
  console.log(`📊 Remplacements effectués: ${replacementCount}/${Object.keys(templateData).length}`);
  return processedHtml;
};

/**
 * Prépare les données d'offre pour le remplacement dans le template
 */
const prepareOfferDataForTemplate = (offerData: any) => {
  console.log("📋 Préparation des données pour template - ID:", offerData.id);
  console.log("📋 Données brutes reçues:", {
    id: offerData.id,
    client_name: offerData.client_name,
    amount: offerData.amount,
    monthly_payment: offerData.monthly_payment,
    financed_amount: offerData.financed_amount
  });
  
  // Use exact DB field names - no guessing
  const templateData = {
    // Basic offer info using real DB columns
    offer_id: offerData.id || '',
    client_name: offerData.client_name || '',
    client_email: offerData.client_email || '',
    client_company: offerData.client?.company || '',
    amount: (offerData.amount || 0).toFixed(2),
    monthly_payment: (offerData.monthly_payment || 0).toFixed(2),
    financed_amount: (offerData.financed_amount || offerData.amount || 0).toFixed(2),
    coefficient: (offerData.coefficient || 0).toFixed(4),
    commission: (offerData.commission || 0).toFixed(2),
    margin: (offerData.margin || 0).toFixed(2),
    
    // Equipment description
    equipment_description: offerData.equipment_description || '',
    
    // Dates
    offer_date: offerData.created_at ? new Date(offerData.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
    current_date: new Date().toLocaleDateString('fr-FR'),
    
    // Status
    status: offerData.status || 'pending',
    workflow_status: offerData.workflow_status || '',
    type: offerData.type || 'admin_offer',
    remarks: offerData.remarks || '',
    
    // Insurance calculations
    insurance_amount: ((offerData.financed_amount || offerData.amount || 0) * 0.02).toFixed(2),
    total_insurance_amount: ((offerData.financed_amount || offerData.amount || 0) * 0.02 * 36).toFixed(2),
    
    // Company defaults for iTakecare
    company_name: 'iTakecare',
    company_address: 'Rue de la Innovation 123, 1000 Bruxelles',
    company_phone: '+32 2 123 45 67',
    company_email: 'contact@itakecare.be',
    
    // Client details from relationships
    client_address: offerData.client?.address || '',
    client_phone: offerData.client?.phone || '',
    client_city: offerData.client?.city || '',
    client_postal_code: offerData.client?.postal_code || '',
    
    // Leaser info
    leaser_name: offerData.leaser?.name || 'Leaser par défaut',
    
    // Default images and logos
    client_logos: '<div class="client-logos"><img src="/api/placeholder/150/60" alt="Logo client" style="max-height: 60px; margin: 0 10px;" /></div>',
    base64_image_cover: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzNlNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudGFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+Q292ZXI8L3RleHQ+PC9zdmc+",
    base64_image_vision: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwYzg1MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudGFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+VmlzaW9uPC90ZXh0Pjwvc3ZnPg==",
    base64_image_logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudGFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+TG9nbzwvdGV4dD48L3N2Zz4="
  };
  
  console.log("✅ Template data prepared with", Object.keys(templateData).length, "fields");
  console.log("🔍 Key values:", {
    offer_id: templateData.offer_id,
    client_name: templateData.client_name,
    amount: templateData.amount,
    monthly_payment: templateData.monthly_payment
  });
  
  return templateData;
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