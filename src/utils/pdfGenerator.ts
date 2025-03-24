
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
      margin: [0, 0, 0, 0],
      filename: `offre-${offerData.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
    
    // Créer un div temporaire pour le rendu
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    
    // Générer le PDF
    console.log("Conversion en PDF...");
    const pdf = await html2pdf().from(tempDiv).set(options).save();
    
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
