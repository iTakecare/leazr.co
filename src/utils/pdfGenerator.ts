
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
      margin: [10, 10, 10, 10], // Légère marge pour éviter les coupures
      filename: `offre-${offerData.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: true, // Activer les logs pour le débogage
        windowWidth: 1050, // Largeur fixe pour éviter les problèmes de mise en page
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait',
        compress: true,
        putOnlyUsedFonts: true
      },
      pagebreak: { avoid: '.avoid-break' } // Éviter les sauts de page sur certains éléments
    };
    
    // Créer un div temporaire pour le rendu
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.width = '210mm'; // Largeur A4
    tempDiv.style.height = '297mm'; // Hauteur A4
    tempDiv.style.position = 'relative'; // Pour le positionnement correct
    tempDiv.style.overflow = 'hidden'; // Empêcher le dépassement
    document.body.appendChild(tempDiv);
    
    console.log("Conversion en PDF...");
    
    // Générer le PDF
    const pdf = await html2pdf()
      .set(options)
      .from(tempDiv)
      .toPdf()
      .get('pdf')
      .then(function(pdfObject) {
        // Vérifier et supprimer les pages supplémentaires
        if (pdfObject.internal.getNumberOfPages() > 1) {
          console.log(`Suppression de ${pdfObject.internal.getNumberOfPages() - 1} pages supplémentaires`);
          for (let i = pdfObject.internal.getNumberOfPages(); i > 1; i--) {
            pdfObject.deletePage(i);
          }
        }
        return pdfObject;
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
