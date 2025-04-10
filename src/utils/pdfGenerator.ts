
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
      margin: [5, 5, 5, 5], // Marges minimales (haut, droite, bas, gauche) en mm
      filename: `offre-${offerData.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Meilleure résolution
        useCORS: true,
        logging: false,
        width: 794, // Largeur A4 en pixels (210mm à 96dpi)
        height: 1123, // Hauteur A4 en pixels (297mm à 96dpi)
        windowWidth: 794,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 15000, // Temps supplémentaire pour charger les images
        allowTaint: true // Permettre les images cross-origin
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait' | 'landscape',
        compress: true,
        precision: 16,
        hotfixes: ["px_scaling"]
      },
      pagebreak: { mode: 'avoid-all' }
    };
    
    // Créer un conteneur avec style optimisé pour A4
    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.height = '297mm';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.innerHTML = htmlContent;
    
    // Précharger l'image du logo avant de générer le PDF
    const preloadLogo = async () => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          console.error("Erreur lors du chargement du logo");
          resolve(); // Continuer même en cas d'erreur
        };
        img.src = "/lovable-uploads/645b6558-da78-4099-a8d4-c78f40873b60.png";
      });
    };
    
    // Attendre que l'image soit préchargée
    await preloadLogo();
    
    // Ajouter le container temporairement au document
    document.body.appendChild(container);
    
    // Réinitialiser les styles globaux qui pourraient interférer
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Générer le PDF et le télécharger automatiquement
    console.log("Début de la génération du PDF...");
    try {
      // Désactiver les warnings lorsque html2pdf s'exécute
      const originalConsoleWarn = console.warn;
      console.warn = (msg) => {
        if (msg && typeof msg === 'string' && msg.includes('jsPDF')) {
          return; // Ignorer les avertissements de jsPDF
        }
        originalConsoleWarn(msg);
      };
      
      // Utiliser la méthode save() pour télécharger automatiquement
      await html2pdf().from(container).set(options).save();
      
      // Rétablir console.warn
      console.warn = originalConsoleWarn;
      console.log("PDF généré et téléchargé avec succès");
    } catch (pdfError) {
      console.error("Erreur durant la génération du PDF:", pdfError);
      throw pdfError;
    } finally {
      // Restaurer les styles du document
      document.body.style.overflow = originalBodyOverflow;
      // Nettoyer le DOM
      document.body.removeChild(container);
    }
    
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
