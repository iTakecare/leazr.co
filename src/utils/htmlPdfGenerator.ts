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
  
  // Remove screen-only elements (preview headers, buttons, etc.)
  cleanedHtml = cleanedHtml
    .replace(/<[^>]*class="[^"]*(preview-header|screen-only|no-pdf|pdf-exclude|hide-on-pdf|hidden-print|client-header)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<header[^>]*class="[^"]*preview[^"]*"[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<section[^>]*class="[^"]*preview[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '')
    .replace(/<[^>]*(data-pdf-exclude\s*=\s*["'](true|1)["'])[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
  
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
  
  // Decode all HTML entities (including &#x26; → &) - FORCE multiple passes
  console.log('🔧 Décodage des entités HTML...');
  for (let i = 0; i < 3; i++) {
    cleanedHtml = cleanedHtml
      .replace(/&amp;/g, '&')
      .replace(/&#x26;/gi, '&')
      .replace(/&#38;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#160;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&#60;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#62;/g, '>');
  }
  
  // Replace pagination references: "voir modalités de leasing en page X" → "voir modalités de leasing"
  console.log('📖 Suppression des références de pagination...');
  cleanedHtml = cleanedHtml.replace(/voir modalités de leasing en page \d+/gi, 'voir modalités de leasing');
  
  // Remove sections with only unfilled placeholders (no real content)
  console.log('🗑️ Suppression des sections avec placeholders vides...');
  cleanedHtml = cleanedHtml.replace(
    /<div[^>]*>\s*(\{\{[^}]+\}\}\s*)+<\/div>/gi, 
    ''
  );
  
  // Remove table rows with only empty placeholders
  cleanedHtml = cleanedHtml.replace(
    /<tr[^>]*>\s*<td[^>]*>\s*(\{\{[^}]+\}\}|\s|&nbsp;)*\s*<\/td>\s*<\/tr>/gi,
    ''
  );
  
  // Parse HTML to DOM for advanced cleaning
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedHtml, 'text/html');
  
  // Deduplicate cover titles: keep only first "Proposition Commerciale" and "pour Services de Leasing IT"
  console.log('🎯 Dédoublonnage des titres de couverture...');
  const coverPage = doc.querySelector('.cover-page, .page:first-child');
  if (coverPage) {
    const h1Elements = coverPage.querySelectorAll('h1');
    const h2Elements = coverPage.querySelectorAll('h2');
    
    let seenProposition = false;
    h1Elements.forEach((h1) => {
      if (h1.textContent?.includes('Proposition Commerciale')) {
        if (seenProposition) {
          console.log('🗑️ Suppression du doublon "Proposition Commerciale"');
          h1.remove();
        } else {
          seenProposition = true;
        }
      }
    });
    
    let seenServices = false;
    h2Elements.forEach((h2) => {
      if (h2.textContent?.includes('pour Services de Leasing IT')) {
        if (seenServices) {
          console.log('🗑️ Suppression du doublon "pour Services de Leasing IT"');
          h2.remove();
        } else {
          seenServices = true;
        }
      }
    });
  }
  
  // Hide "ILS NOUS FONT CONFIANCE" section if empty or contains only placeholder text
  console.log('👥 Vérification de la section clients...');
  const clientsSections = doc.querySelectorAll('.clients-section, [class*="clients"]');
  clientsSections.forEach((section) => {
    const text = section.textContent || '';
    const hasRealLogos = section.querySelectorAll('img').length > 0 && 
                         !text.includes('/api/placeholder');
    const hasPlaceholderText = /Client [123]/.test(text) || text.includes('placeholder');
    
    if (!hasRealLogos || hasPlaceholderText) {
      console.log('🗑️ Suppression de la section clients (vide ou placeholder)');
      section.remove();
    }
  });
  
  // Remove empty .page divs (pages with no meaningful content) - FIRST PASS
  console.log('📄 Suppression des pages vides (Pass 1)...');
  const pages = doc.querySelectorAll('.page');
  let removedPages = 0;
  
  pages.forEach((page) => {
    const textContent = page.textContent?.trim() || '';
    const hasImages = page.querySelectorAll('img').length > 0;
    const hasPlaceholders = /\{\{[^}]+\}\}/.test(textContent);
    
    // Remove if:
    // - No text content and no images
    // - Only whitespace
    // - Only contains unfilled placeholders
    const isEmptyPage = !textContent || 
                        textContent.length < 10 || 
                        (hasPlaceholders && textContent.replace(/\{\{[^}]+\}\}/g, '').trim().length < 10);
    
    if (isEmptyPage && !hasImages) {
      console.log(`🗑️ Suppression d'une page vide (contenu: "${textContent.substring(0, 50)}...")`);
      page.remove();
      removedPages++;
    }
  });
  
  console.log(`✅ ${removedPages} page(s) vide(s) supprimée(s)`);
  
  // Remove duplicate consecutive sections with same class
  console.log('🔄 Suppression des sections dupliquées...');
  const allSections = doc.querySelectorAll('[class]');
  let previousSection: Element | null = null;
  let removedDuplicates = 0;
  
  allSections.forEach((section) => {
    if (previousSection && 
        previousSection.className === section.className &&
        previousSection.textContent?.trim() === section.textContent?.trim() &&
        previousSection.textContent &&
        previousSection.textContent.length > 20) {
      console.log(`🗑️ Section dupliquée supprimée: .${section.className.split(' ')[0]}`);
      section.remove();
      removedDuplicates++;
    } else {
      previousSection = section;
    }
  });
  
  console.log(`✅ ${removedDuplicates} section(s) dupliquée(s) supprimée(s)`);
  
  // Serialize back to HTML
  cleanedHtml = doc.body.innerHTML;
  
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
        after: '.page',
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
          page-break-inside: avoid;
        }
        
        .page:last-child { 
          page-break-after: auto !important; 
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
      
      // PASS 2: Remove empty pages from DOM after render
      console.log('📄 Suppression des pages vides (Pass 2 - DOM)...');
      const domPages = container.querySelectorAll('.page');
      domPages.forEach((page) => {
        const textContent = page.textContent?.trim() || '';
        const hasImages = page.querySelectorAll('img').length > 0;
        
        if ((!textContent || textContent.length < 10) && !hasImages) {
          console.log('🗑️ Suppression page vide (DOM)');
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
    
    // Empty defaults - no demo data
    client_logos: '',
    base64_image_cover: '',
    base64_image_vision: '',
    base64_image_logo: ''
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