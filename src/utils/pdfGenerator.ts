
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
    
    // Configuration précise pour le PDF
    const options = {
      margin: [5, 5, 5, 5], // Réduire les marges pour maximiser l'espace
      filename: `offre-${offerData.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Augmenter la résolution
        useCORS: true,
        logging: true,
        windowWidth: 1000, // Augmenter la largeur de la fenêtre pour éviter les problèmes de mise en page
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait' | 'landscape'  // Fixed: explicitly cast to the correct union type
      }
    };
    
    // Créer un conteneur temporaire avec style fixe pour A4
    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.boxSizing = 'border-box';
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
