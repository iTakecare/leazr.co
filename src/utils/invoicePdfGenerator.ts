import html2pdf from 'html2pdf.js';
import InvoicePDFTemplate from '@/components/pdf/InvoicePDFTemplate';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type { Invoice } from '@/services/invoiceService';

/**
 * Générer un PDF à partir des données de la facture
 */
export const generateInvoicePdf = async (invoice: Invoice, companyInfo?: any) => {
  try {
    console.log("Début de la génération du PDF pour la facture:", invoice.id);
    
    // Générer le HTML avec React
    const htmlContent = ReactDOMServer.renderToString(
      React.createElement(InvoicePDFTemplate, { invoice, companyInfo })
    );
    
    // Configuration optimisée pour le PDF A4
    const options = {
      margin: [5, 5, 5, 5], // Marges minimales (haut, droite, bas, gauche) en mm
      filename: `facture-${invoice.invoice_number || invoice.id.substring(0, 8)}.pdf`,
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
        imageTimeout: 15000,
        allowTaint: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' as 'portrait', 
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

/**
 * Télécharger directement le PDF d'une facture
 */
export const downloadInvoicePdf = async (invoice: Invoice, companyInfo?: any) => {
  try {
    const filename = await generateInvoicePdf(invoice, companyInfo);
    console.log("PDF de facture téléchargé:", filename);
    return filename;
  } catch (error) {
    console.error("Erreur lors du téléchargement du PDF de facture:", error);
    throw error;
  }
};