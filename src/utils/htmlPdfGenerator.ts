import html2pdf from 'html2pdf.js';
import HtmlTemplateService, { convertOfferToTemplateData, HtmlTemplateData } from '@/services/htmlTemplateService';
import DOMPurify from 'dompurify';

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
 * Décode tous les nœuds texte du DOM pour éliminer les entités HTML
 */
const decodeAllTextNodes = (root: HTMLElement): void => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const textarea = document.createElement('textarea');
  const nodesToUpdate: Array<{ node: Text; value: string }> = [];
  
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (textNode.nodeValue) {
      textarea.innerHTML = textNode.nodeValue;
      let decoded = textarea.value;
      
      decoded = decoded
        .replace(/&#x26;/g, '&')
        .replace(/&#38;/g, '&')
        .replace(/&amp;/g, '&');
      
      if (decoded !== textNode.nodeValue) {
        nodesToUpdate.push({ node: textNode, value: decoded });
      }
    }
  }
  
  nodesToUpdate.forEach(({ node, value }) => {
    node.nodeValue = value;
  });
};

/**
 * Normalise les références de page (ex: "en page X" → supprimé)
 */
const normalizePageReferenceNotes = (root: HTMLElement): void => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodesToUpdate: Array<{ node: Text; value: string }> = [];
  
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (textNode.nodeValue) {
      const normalized = textNode.nodeValue
        .replace(/en page\s+\d+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (normalized !== textNode.nodeValue) {
        nodesToUpdate.push({ node: textNode, value: normalized });
      }
    }
  }
  
  nodesToUpdate.forEach(({ node, value }) => {
    node.nodeValue = value;
  });
};

/**
 * Masque la section "ILS NOUS FONT CONFIANCE" si elle ne contient que des placeholders
 */
const hideClientsSectionIfPlaceholder = (root: HTMLElement): void => {
  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  for (const heading of headings) {
    const text = heading.textContent?.trim() || '';
    if (/ILS NOUS FONT CONFIANCE/i.test(text)) {
      const section = heading.closest('section, .page, div[class*="client"]') || heading.parentElement;
      
      if (section) {
        const sectionText = section.textContent || '';
        const hasPlaceholderText = /Client\s+[123]/i.test(sectionText);
        const realImages = section.querySelectorAll('img[src]:not([src*="placeholder"])');
        const hasRealLogos = realImages.length > 0;
        
        if (hasPlaceholderText && !hasRealLogos) {
          console.log("🗑️ Suppression de la section 'ILS NOUS FONT CONFIANCE' (placeholder uniquement)");
          section.remove();
        }
      }
      break;
    }
  }
};

/**
 * Déduplique les titres de la couverture
 */
const deduplicateCoverTitles = (root: HTMLElement): void => {
  const coverPage = root.querySelector('.cover-page, .page:first-child');
  if (!coverPage) return;
  
  const seenTitles = new Set<string>();
  const elementsToRemove: Element[] = [];
  
  const textElements = coverPage.querySelectorAll('h1, h2, h3, p, span, div');
  
  for (const element of textElements) {
    const normalizedText = element.textContent?.trim().toLowerCase() || '';
    
    const isPropositionCommerciale = /proposition\s+commerciale/i.test(normalizedText);
    const isPourServices = /pour\s+services\s+de\s+leasing/i.test(normalizedText);
    
    if (isPropositionCommerciale || isPourServices) {
      if (seenTitles.has(normalizedText)) {
        console.log("🗑️ Suppression du titre dupliqué:", normalizedText);
        elementsToRemove.push(element);
      } else {
        seenTitles.add(normalizedText);
      }
    }
  }
  
  elementsToRemove.forEach(el => el.remove());
};

/**
 * Nettoie le HTML en supprimant les sections qui ne doivent pas apparaître dans le PDF
 */
const cleanHtmlForPdf = (html: string): string => {
  console.log("🧹 Nettoyage du HTML pour PDF");
  
  let cleanedHtml = html
    .replace(/&amp;/g, '&')
    .replace(/&#x26;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  cleanedHtml = DOMPurify.sanitize(cleanedHtml, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'br', 'strong', 'em', 'u', 'a', 'section', 'article', 'header', 'footer', 'nav', 'aside'],
    ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height', 'href', 'target', 'colspan', 'rowspan', 'data-*'],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target'],
  });
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedHtml, 'text/html');
  
  const pageElements = doc.querySelectorAll('.page');
  pageElements.forEach((page) => {
    const textContent = page.textContent?.trim() || '';
    const hasImages = page.querySelectorAll('img').length > 0;
    const hasTables = page.querySelectorAll('table').length > 0;
    
    if (!textContent && !hasImages && !hasTables) {
      console.log("🗑️ Suppression d'une page vide détectée (Pass 1)");
      page.remove();
    }
  });
  
  cleanedHtml = doc.body.innerHTML;
  
  console.log("✅ HTML nettoyé et sanitisé");
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
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait',
        compress: true,
        precision: 16
      },
      pagebreak: { 
        mode: ['css', 'legacy'],
        avoid: 'img, table, .card, .section, h1, h2, .solution-box, .step-card, .testimonial-card, .value-item'
      }
    };
    
    console.log("Configuration PDF optimisée:", pdfOptions);
    
    // Créer un conteneur temporaire avec styles spécifiques pour PDF
    const container = document.createElement('div');
    container.className = 'pdf-root';
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
      position: fixed;
      left: 0;
      top: 0;
      overflow: hidden;
    `;
    
    // Sanitize HTML before setting innerHTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(cleanedHtml, {
      ALLOWED_TAGS: ['div', 'p', 'span', 'img', 'strong', 'em', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
      ALLOWED_ATTR: ['src', 'alt', 'class', 'style', 'width', 'height', 'colspan', 'rowspan']
    });
    
    // Inject PDF normalization CSS
    const pdfNormalizationCss = `
      <style>
        .pdf-root, .pdf-ready {
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
        .pdf-root *, .pdf-ready * { 
          box-sizing: border-box !important; 
        }
        .pdf-root .container, 
        .pdf-ready .container, 
        .pdf-root [class*="container"] {
          max-width: 210mm !important; 
          width: 210mm !important; 
          padding: 0 !important; 
          margin: 0 !important; 
          box-shadow: none !important; 
          background: transparent !important;
        }
        .no-pdf, .screen-only, .preview-header, .hidden-print, .hide-on-pdf, 
        [data-pdf-exclude="true"], .client-header { 
          display: none !important; 
        }
        
        /* Pages: Contrôle strict des page-breaks pour éviter pages vides */
        .page { 
          width: 210mm !important; 
          min-height: 297mm !important;
          padding: 10mm !important; 
          margin: 0 !important;
          box-shadow: none !important;
          overflow: visible;
        }
        
        /* Pages spéciales avec page-break-after */
        .cover-page {
          page-break-after: always !important;
        }
        
        .final-page {
          page-break-after: auto !important;
        }
        
        .page-break { 
          display: block; 
          height: 0; 
          page-break-before: always; 
        }
        
        /* Éviter les coupures dans les éléments clés */
        table, .equipment-section, .summary-section, 
        .solution-box, .step-card, .testimonial-card,
        .value-item, .modalities-content { 
          break-inside: avoid !important; 
          page-break-inside: avoid !important; 
        }
        
        /* Masquer les sections vides ou avec uniquement placeholders */
        .clients-section:empty,
        [class*="section"]:empty {
          display: none !important;
        }
      </style>
    `;
    
    container.innerHTML = pdfNormalizationCss + sanitizedHtml;
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
      
      // Pass 2: Nettoyages DOM après insertion
      console.log("🧹 Pass 2: Nettoyages DOM avancés");
      decodeAllTextNodes(container);
      normalizePageReferenceNotes(container);
      hideClientsSectionIfPlaceholder(container);
      deduplicateCoverTitles(container);
      
      // Suppression finale des pages vides après tous les nettoyages
      const finalPageElements = container.querySelectorAll('.page');
      finalPageElements.forEach((page) => {
        const textContent = page.textContent?.trim() || '';
        const hasImages = page.querySelectorAll('img[src]:not([src=""])').length > 0;
        const hasTables = page.querySelectorAll('table').length > 0;
        const hasHeadings = page.querySelectorAll('h1, h2, h3').length > 0;
        const hasLists = page.querySelectorAll('ul, ol').length > 0;
        
        const hasSignificantContent = textContent.length > 20 || hasImages || hasTables || hasHeadings || hasLists;
        
        if (!hasSignificantContent) {
          console.log("🗑️ Suppression d'une page vide détectée (Pass 2)");
          page.remove();
        }
      });
      
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
    
    // Insurance calculations : 3.5% du total des mensualités sur 36 mois
    insurance_amount: (((offerData.monthly_payment || 0) * 36) * 0.035).toFixed(2),
    total_insurance_amount: (((offerData.monthly_payment || 0) * 36) * 0.035).toFixed(2),
    
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
    
    // Images - VIDES pour éviter les placeholders
    client_logos: '',
    base64_image_cover: '',
    base64_image_vision: '',
    base64_image_logo: '',
    company_logo: ''
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
    
    // Ouvrir dans une nouvelle fenêtre avec une approche plus sécurisée
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      // Utiliser une approche plus sécurisée avec un Blob URL
      const blob = new Blob([compiledHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      previewWindow.location.href = url;
      
      // Nettoyer l'URL après un délai pour éviter les fuites mémoire
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
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