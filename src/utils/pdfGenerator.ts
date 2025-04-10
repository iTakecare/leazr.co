
import html2pdf from 'html2pdf.js';
import OfferPDFTemplate from '@/components/pdf/OfferPDFTemplate';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

/**
 * Générer un PDF à partir des données de l'offre
 */
export const generateOfferPdf = async (offerData) => {
  try {
    console.log("Début de la génération du PDF pour l'offre:", offerData.id);
    
    // Utiliser le nouveau template pour générer le HTML
    const htmlContent = ReactDOMServer.renderToString(
      React.createElement(OfferPDFTemplate, { offer: offerData })
    );
    
    // Configurer les options de génération du PDF
    const options = {
      margin: [15, 15, 15, 15], // Marges plus généreuses pour éviter les coupes de texte
      filename: `offre-${offerData.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3, // Augmentation de la résolution pour une meilleure qualité
        useCORS: true,
        logging: true, // Activer les logs pour identifier les problèmes
        windowWidth: 1200, // Augmentation de la largeur pour éviter les coupes
        scrollY: 0,
        scrollX: 0,
        allowTaint: true,
        foreignObjectRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait' | 'landscape',
        compress: true,
        putOnlyUsedFonts: true,
        precision: 16 // Augmenter la précision
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    // Préparation du DOM pour le rendu
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.height = '297mm'; // Hauteur A4
    tempDiv.style.width = '210mm';  // Largeur A4
    tempDiv.style.position = 'relative';
    tempDiv.style.margin = '0';
    tempDiv.style.padding = '0';
    tempDiv.style.overflow = 'hidden';
    tempDiv.style.fontSize = '11pt'; // Taille de police standard
    document.body.appendChild(tempDiv);
    
    // Générer le PDF
    console.log("Conversion en PDF avec options:", JSON.stringify(options, null, 2));
    const pdf = await html2pdf()
      .from(tempDiv)
      .set(options)
      .toPdf()
      .get('pdf')
      .then(pdf => {
        // S'assurer qu'il n'y a qu'une seule page
        if (pdf.internal.getNumberOfPages() > 1) {
          console.log(`PDF généré avec ${pdf.internal.getNumberOfPages()} pages, conservation de la première page uniquement`);
          // Supprimer les pages supplémentaires si elles existent
          while (pdf.internal.getNumberOfPages() > 1) {
            pdf.deletePage(pdf.internal.getNumberOfPages());
          }
        }
        return pdf;
      })
      .save();
    
    // Nettoyage
    document.body.removeChild(tempDiv);
    
    console.log("PDF généré avec succès:", options.filename);
    return options.filename;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};

// Appliquer des personnalisations au modèle PDF selon les préférences de l'utilisateur
export const applyTemplateCustomizations = (template, customizations) => {
  if (!template || !customizations) return template;
  
  return {
    ...template,
    ...customizations
  };
};
