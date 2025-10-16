
import html2pdf from 'html2pdf.js';
import OfferPDFTemplate from '@/components/pdf/OfferPDFTemplate';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { generateItakecareOfferPdf } from './htmlPdfGenerator';

/**
 * Générer un PDF à partir des données de l'offre avec support des templates HTML
 */
export const generateOfferPdf = async (offerData, pdfOptions?: { useHtmlTemplate?: boolean; customTemplate?: string; templateData?: any }) => {
  try {
    console.log("Début de la génération du PDF pour l'offre:", offerData.id);
    
    // Vérifier si on doit utiliser le template HTML
    if (pdfOptions?.useHtmlTemplate) {
      console.log("🎯 Utilisation du template HTML simplifié pour la génération PDF");
      console.log("📄 Custom template fourni:", !!pdfOptions.customTemplate);
      
      // Si on a un template personnalisé (de la DB), l'utiliser directement avec la nouvelle méthode
      if (pdfOptions.customTemplate) {
        console.log("✅ Utilisation du template de la base de données avec méthode simplifiée");
        
        // Utiliser directement generateSimplePdf pour éviter Handlebars
        const { generateSimplePdf } = await import('./htmlPdfGenerator');
        return await generateSimplePdf(
          pdfOptions.customTemplate,
          offerData,
          { filename: `offre-${offerData.id.substring(0, 8)}.pdf` }
        );
      } else {
        console.log("⚠️ Aucun template HTML fourni, utilisation du fallback React");
        // Fallback vers le template React si pas de template HTML
      }
    }
    
    // Mode classique avec template React
    console.log("Utilisation du template React classique");
    
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
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 15000, // Temps supplémentaire pour charger les images
        allowTaint: true // Permettre les images cross-origin
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait', 
        compress: true,
        precision: 16,
        hotfixes: ["px_scaling"]
      },
      pagebreak: { 
        mode: ['css', 'legacy'],
        avoid: 'img, table, .card, .section, h1, h2'
      }
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
    
    // Générer le PDF avec promesse pour assurer la complétion
    console.log("Génération du PDF en cours...");
    const pdf = await html2pdf()
      .from(container)
      .set(options)
      .save();
    
    // Restaurer les styles du document
    document.body.style.overflow = originalBodyOverflow;
    
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
