
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
    
    // Générer le HTML avec React
    const htmlContent = ReactDOMServer.renderToString(
      React.createElement(OfferPDFTemplate, { offer: offerData })
    );
    
    // Configuration optimisée pour le PDF A4 sur une seule page
    const options = {
      margin: [10, 10, 10, 10], // Marges réduites uniformément
      filename: `offre-${offerData.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Meilleure résolution
        useCORS: true,
        logging: true,
        windowWidth: 794, // Largeur exacte A4 en pixels
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait' | 'landscape',
        compress: true // Compression pour optimiser la taille
      }
    };
    
    // Créer un conteneur temporaire avec style fixe pour A4
    const container = document.createElement('div');
    container.style.width = '210mm'; // Largeur A4
    container.style.height = '297mm'; // Hauteur A4
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'hidden'; // Empêcher tout débordement
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    
    // Générer le PDF
    const pdf = await html2pdf()
      .from(container)
      .set(options)
      .save();
    
    // Nettoyer le DOM
    document.body.removeChild(container);
    
    console.log("PDF généré avec succès");
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
