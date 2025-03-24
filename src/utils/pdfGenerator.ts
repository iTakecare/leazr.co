
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import html2canvas from "html2canvas";
import OfferTemplate from "@/components/offer/OfferTemplate";
import React from "react";
import ReactDOMServer from "react-dom/server";

/**
 * Génère un PDF à partir des données d'offre et d'un modèle PDF
 */
export const generateOfferPdf = async (offerData: any): Promise<string> => {
  try {
    console.log("Début de la génération du PDF pour l'offre", offerData.id);
    
    // Vérifier si l'offre a un modèle PDF associé
    if (!offerData.__template) {
      console.error("Aucun modèle PDF n'est associé à cette offre");
      throw new Error("Aucun modèle PDF n'est associé à cette offre");
    }
    
    const template = offerData.__template;
    
    console.log("Utilisation du modèle:", template.name);
    console.log("Option useOfferTemplate:", template.useOfferTemplate ? "Activée" : "Désactivée");
    
    // Si l'option useOfferTemplate est activée, générer le PDF à partir du composant OfferTemplate
    if (template.useOfferTemplate) {
      return await generatePdfFromOfferTemplate(offerData, template);
    }
    
    // Sinon, utiliser la méthode standard avec les images de modèle
    console.log("Utilisation des images de modèle");
    
    // Vérifier si le modèle a des images
    if (!template.templateImages || template.templateImages.length === 0) {
      console.error("Aucune image n'est définie dans le modèle PDF");
      throw new Error("Aucune image n'est définie dans le modèle PDF");
    }
    
    // Initialiser le document PDF
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "portrait"
    });

    // Dimensions de la page A4
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    console.log(`Dimensions de la page: ${pageWidth}x${pageHeight}`);
    
    // Parcourir chaque page du modèle
    for (let pageIndex = 0; pageIndex < template.templateImages.length; pageIndex++) {
      if (pageIndex > 0) {
        doc.addPage();
      }
      
      const pageImage = template.templateImages[pageIndex];
      console.log(`Traitement de la page ${pageIndex + 1}:`, pageImage.name);
      
      // Ajouter l'image de la page
      if (pageImage.data) {
        console.log(`Ajout de l'image de la page ${pageIndex + 1} à partir des données`);
        doc.addImage(pageImage.data, "JPEG", 0, 0, pageWidth, pageHeight);
      } else if (pageImage.url) {
        try {
          console.log(`Téléchargement de l'image depuis l'URL: ${pageImage.url}`);
          const img = new Image();
          img.crossOrigin = "Anonymous";
          
          // Charger l'image depuis l'URL avec un timeout
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Timeout lors du chargement de l'image: ${pageImage.url}`));
            }, 20000);
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            
            img.onerror = () => {
              clearTimeout(timeout);
              reject(new Error(`Erreur lors du chargement de l'image: ${pageImage.url}`));
            };
            
            img.src = pageImage.url;
          });
          
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL("image/jpeg");
            
            doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
            console.log(`Image ajoutée à la page ${pageIndex + 1}`);
          } else {
            console.error("Impossible d'obtenir le contexte 2D du canvas");
          }
        } catch (error) {
          console.error(`Erreur lors du chargement de l'image de la page ${pageIndex + 1}:`, error);
          
          // Si l'image ne peut pas être chargée, ajouter une page blanche avec un message d'erreur
          doc.setFontSize(14);
          doc.setTextColor(255, 0, 0);
          doc.text("Erreur: Impossible de charger l'image du modèle", 100, 100);
        }
      }
      
      // Ajouter les champs de texte de cette page
      if (template.fields && template.fields.length > 0) {
        console.log(`Traitement des champs de la page ${pageIndex + 1}`);
        
        // Filtrer les champs pour cette page
        const fieldsForPage = template.fields.filter(field => field.page === pageIndex && field.isVisible);
        console.log(`${fieldsForPage.length} champs à ajouter à la page ${pageIndex + 1}`);
        
        for (const field of fieldsForPage) {
          try {
            if (!field.position || typeof field.position.x !== "number" || typeof field.position.y !== "number") {
              console.warn(`Position invalide pour le champ "${field.label}" (${field.id})`);
              continue;
            }
            
            // Résoudre les variables dans les valeurs de champ
            let fieldValue = field.value;
            if (typeof fieldValue === "string" && fieldValue.includes("{")) {
              fieldValue = fieldValue.replace(/\{([^}]+)\}/g, (match, key) => {
                const value = offerData[key];
                return value !== undefined ? String(value) : match;
              });
            }
            
            // Configurer le style du texte
            if (field.style) {
              doc.setFont("helvetica", field.style.fontStyle === "italic" ? "italic" : "normal");
              doc.setFontSize(field.style.fontSize || 12);
              
              if (field.style.color) {
                // Convertir la couleur hexadécimale en RGB
                const hex = field.style.color.replace("#", "");
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                doc.setTextColor(r, g, b);
              } else {
                doc.setTextColor(0, 0, 0);
              }
              
              // Gestion du poids de la police
              if (field.style.fontWeight === "bold") {
                doc.setFont("helvetica", field.style.fontStyle === "italic" ? "bolditalic" : "bold");
              }
            } else {
              // Style par défaut
              doc.setFont("helvetica", "normal");
              doc.setFontSize(12);
              doc.setTextColor(0, 0, 0);
            }
            
            // Ajouter le texte
            doc.text(fieldValue, field.position.x, field.position.y);
            console.log(`Champ "${field.label}" (${field.id}) ajouté à la position (${field.position.x}, ${field.position.y}) avec la valeur "${fieldValue}"`);
          } catch (fieldError) {
            console.error(`Erreur lors de l'ajout du champ "${field.label}" (${field.id}):`, fieldError);
          }
        }
      }
    }
    
    // Nom du fichier
    const dateStr = format(new Date(), "yyyy-MM-dd", { locale: fr });
    const clientName = offerData.client_name || "client";
    const sanitizedClientName = clientName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    
    const fileName = `offre_${sanitizedClientName}_${dateStr}.pdf`;
    
    // Enregistrer le PDF
    const pdfBlob = doc.output("blob");
    saveAs(pdfBlob, fileName);
    
    console.log("PDF généré avec succès:", fileName);
    return fileName;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};

/**
 * Génère un PDF à partir du composant OfferTemplate
 */
const generatePdfFromOfferTemplate = async (offerData: any, template: any): Promise<string> => {
  try {
    console.log("Génération du PDF à partir du composant OfferTemplate");
    
    // Préparer les données pour OfferTemplate
    const equipmentItems = prepareEquipmentItems(offerData);
    
    // Définir les propriétés pour le composant OfferTemplate
    const offerProps = {
      offerNumber: offerData.offer_id || offerData.id?.substring(0, 8).toUpperCase() || "EXEMPLE",
      referenceNumber: offerData.reference_number || `REF-${offerData.id?.substring(0, 6).toUpperCase()}`,
      date: offerData.created_at,
      clientName: offerData.client_name || "Client",
      clientCompany: offerData.client_company,
      clientContact: offerData.client_email,
      equipment: equipmentItems,
      totalMonthly: offerData.monthly_payment || 0,
      companyInfo: {
        name: template.companyName,
        address: template.companyAddress,
        taxId: template.companySiret,
        contact: template.companyContact
      },
      footerText: template.footerText,
      logo: template.logoURL,
      // Si l'offre a une signature, ajouter une fonction de rendu pour la section de signature
      renderSignatureSection: offerData.signature_data ? () => {
        return (
          `<div class="border rounded-md overflow-hidden">
            <div class="bg-gray-50 p-4 border-b flex justify-between items-center">
              <h3 class="font-semibold">Offre signée</h3>
              <div class="bg-green-50 text-green-700 border-green-200 px-2 py-1 rounded text-sm">
                Signée le ${format(new Date(offerData.signed_at || new Date()), "dd MMMM yyyy", { locale: fr })}
              </div>
            </div>
            <div class="p-4 bg-white">
              <div class="flex justify-center mb-2">
                <img 
                  src="${offerData.signature_data}" 
                  alt="Signature" 
                  class="max-h-40 object-contain border" 
                />
              </div>
              <div class="text-center text-sm text-gray-600">
                Signé électroniquement par ${offerData.signer_name || "le client"}
              </div>
            </div>
          </div>`
        );
      } : undefined
    };
    
    // Rendre le composant OfferTemplate en HTML
    const htmlContent = ReactDOMServer.renderToString(
      React.createElement(OfferTemplate, offerProps)
    );
    
    // Créer un élément div pour contenir le HTML rendu
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    
    // Utiliser html2canvas pour capturer le contenu rendu
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // Meilleure qualité
      useCORS: true,
      logging: false,
      allowTaint: true
    });
    
    // Nettoyer
    document.body.removeChild(tempDiv);
    
    // Créer un PDF
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    
    const pdf = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "portrait"
    });
    
    // Dimensions de la page A4
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculer les dimensions pour conserver le ratio d'aspect
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    
    const imgX = (pageWidth - imgWidth * ratio) / 2;
    const imgY = 0;
    
    pdf.addImage(imgData, "JPEG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    
    // Nom du fichier
    const dateStr = format(new Date(), "yyyy-MM-dd", { locale: fr });
    const clientName = offerData.client_name || "client";
    const sanitizedClientName = clientName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    
    const fileName = `offre_${sanitizedClientName}_${dateStr}.pdf`;
    
    // Enregistrer le PDF
    const pdfBlob = pdf.output("blob");
    saveAs(pdfBlob, fileName);
    
    console.log("PDF généré avec succès à partir du composant OfferTemplate:", fileName);
    return fileName;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF à partir du composant OfferTemplate:", error);
    throw error;
  }
};

/**
 * Prépare les données d'équipement pour OfferTemplate
 */
const prepareEquipmentItems = (offerData: any) => {
  try {
    // Si l'offre contient déjà une liste d'équipements structurée
    if (offerData.equipment_data && Array.isArray(offerData.equipment_data)) {
      return offerData.equipment_data.map((item: any) => ({
        designation: item.title || item.designation || "Équipement",
        quantity: item.quantity || 1,
        monthly_price: item.monthlyPayment || item.monthly_price || 0
      }));
    }
    
    // Essayer de parser equipment_description si c'est une chaîne JSON
    if (offerData.equipment_description) {
      try {
        const equipment = typeof offerData.equipment_description === 'string' 
          ? JSON.parse(offerData.equipment_description) 
          : offerData.equipment_description;
        
        if (Array.isArray(equipment)) {
          return equipment.map((item: any) => ({
            designation: item.title || item.designation || "Équipement",
            quantity: item.quantity || 1,
            monthly_price: item.monthlyPayment || item.monthly_price || 0
          }));
        }
      } catch (e) {
        console.error("Erreur lors du parsing des données d'équipement:", e);
      }
    }
    
    // Fallback: Créer un seul élément à partir des données de l'offre
    return [{
      designation: offerData.equipment_description || "Équipement",
      quantity: 1,
      monthly_price: offerData.monthly_payment || 0
    }];
  } catch (error) {
    console.error("Erreur lors de la préparation des données d'équipement:", error);
    return [{
      designation: "Erreur: Données d'équipement non disponibles",
      quantity: 1,
      monthly_price: 0
    }];
  }
};
