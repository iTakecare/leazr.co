
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
      margin: [10, 10, 10, 10], // Marge légère pour éviter les coupures
      filename: `offre-${offerData.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1024,
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait' | 'landscape',
        compress: true,
        putOnlyUsedFonts: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // Options correctes pour les sauts de page
    };
    
    // Créer un div temporaire pour le rendu avec une hauteur fixe
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.height = '297mm'; // Hauteur A4
    tempDiv.style.width = '210mm';  // Largeur A4
    tempDiv.style.position = 'relative';
    document.body.appendChild(tempDiv);
    
    // Générer le PDF
    console.log("Conversion en PDF...");
    const pdf = await html2pdf()
      .from(tempDiv)
      .set(options)
      .toPdf() // This method is defined in our type definition
      .get('pdf')
      .then(pdf => {
        // S'assurer qu'il n'y a qu'une seule page
        if (pdf.internal.getNumberOfPages() > 1) {
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
