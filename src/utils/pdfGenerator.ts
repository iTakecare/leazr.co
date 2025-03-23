
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Fonction pour vérifier et créer la table pdf_templates si nécessaire
const ensurePDFTemplateTableExists = async () => {
  const supabase = getSupabaseClient();
  
  try {
    // Vérifier si la table existe
    const { data: tableExists, error: tableCheckError } = await supabase.rpc(
      'check_table_exists',
      { table_name: 'pdf_templates' }
    );
    
    if (tableCheckError || !tableExists) {
      // La table n'existe pas, la créer
      const { error: createError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.pdf_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            "companyName" TEXT NOT NULL,
            "companyAddress" TEXT NOT NULL,
            "companyContact" TEXT NOT NULL,
            "companySiret" TEXT NOT NULL,
            "logoURL" TEXT,
            "primaryColor" TEXT NOT NULL,
            "secondaryColor" TEXT NOT NULL,
            "headerText" TEXT NOT NULL,
            "footerText" TEXT NOT NULL,
            "templateImages" JSONB,
            fields JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );
        `
      });
      
      if (createError) {
        console.error("Erreur lors de la création de la table pdf_templates:", createError);
        return null;
      }
      
      return null;
    }
    
    return tableExists;
  } catch (error) {
    console.error("Erreur lors de la vérification de la table pdf_templates:", error);
    return null;
  }
};

// Récupérer le modèle PDF depuis la base de données
const getPDFTemplate = async () => {
  const supabase = getSupabaseClient();
  
  try {
    // S'assurer que la table existe
    await ensurePDFTemplateTableExists();
    
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', 'default')
      .single();
    
    if (error) {
      console.error("Erreur lors de la récupération du modèle PDF:", error);
      return null;
    }
    
    return data || null;
  } catch (error) {
    console.error("Erreur lors de la récupération du modèle PDF:", error);
    return null;
  }
};

// Précharger les images des modèles
const preloadImages = async (templateImages) => {
  if (!templateImages || templateImages.length === 0) {
    console.log("No template images to preload");
    return [];
  }
  
  console.log(`Attempting to preload ${templateImages.length} images`);
  
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      if (!url || typeof url !== 'string' || url.length < 10) {
        console.error("Invalid image URL:", url);
        reject(new Error("Invalid image URL"));
        return;
      }
      
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error(`Image load timeout: ${url.substring(0, 50)}...`);
        reject(new Error("Image load timeout"));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`Image loaded successfully: ${url.substring(0, 50)}...`);
        resolve(img);
      };
      
      img.onerror = (err) => {
        clearTimeout(timeout);
        console.error(`Failed to load image: ${url.substring(0, 50)}...`, err);
        reject(err);
      };
      
      img.src = url;
    });
  };
  
  try {
    // Filter out entries with invalid image data first
    const validTemplateImages = templateImages.filter(img => 
      img && (img.data || img.url) && typeof (img.data || img.url) === 'string'
    );
    
    if (validTemplateImages.length === 0) {
      console.error("No valid template images found after filtering");
      return [];
    }
    
    console.log(`Loading ${validTemplateImages.length} valid images`);
    
    const imagePromises = validTemplateImages.map(img => {
      const imageUrl = img.data || img.url;
      return loadImage(imageUrl)
        .then(image => ({ ...img, image }))
        .catch(err => {
          console.error(`Error loading image for page ${img.page}:`, err);
          return { ...img, image: null, loadError: err.message || "Unknown error" };
        });
    });
    
    const results = await Promise.all(imagePromises);
    
    // Count successfully loaded images
    const successCount = results.filter(r => r.image).length;
    console.log(`Successfully loaded ${successCount} out of ${templateImages.length} images`);
    
    return results;
  } catch (error) {
    console.error("Error during image preloading:", error);
    return [];
  }
};

export const generateOfferPdf = async (offer: any) => {
  console.log("Starting PDF generation with offer:", {
    id: offer.id,
    client_name: offer.client_name,
    hasTemplate: !!offer.__template
  });
  
  // Si l'offre contient déjà un template, l'utiliser (pour les aperçus)
  const template = offer.__template || await getPDFTemplate();
  
  if (!template) {
    console.error("No template available for PDF generation");
    throw new Error("No template available for PDF generation");
  }
  
  console.log("Using template:", {
    name: template.name,
    templateImagesCount: template.templateImages?.length || 0,
    fieldsCount: template.fields?.length || 0
  });
  
  // Logs détaillés pour le débogage des champs
  if (template.fields && Array.isArray(template.fields) && template.fields.length > 0) {
    console.log("Champs disponibles:");
    template.fields.forEach((field, idx) => {
      console.log(`Champ ${idx}:`, {
        id: field.id,
        value: field.value,
        page: field.page,
        hasPosition: !!field.position,
        x: field.position?.x,
        y: field.position?.y
      });
    });
  } else {
    console.warn("Aucun champ disponible dans le modèle");
  }
  
  // Supprimer le template de l'offre si présent (pour éviter de le stocker)
  if (offer.__template) {
    delete offer.__template;
  }
  
  // Créer un nouveau document PDF
  const doc = new jsPDF();
  
  // Définir les propriétés du document
  doc.setProperties({
    title: `Offre ${offer.id.slice(0, 8)}`,
    subject: 'Offre commerciale',
    author: template?.companyName || 'iTakeCare',
    keywords: 'offre, leasing, équipement',
    creator: template?.companyName || 'iTakeCare Plateforme'
  });
  
  // Définir les couleurs principales en fonction du modèle
  const primaryColor = template?.primaryColor || '#2C3E50';
  const secondaryColor = template?.secondaryColor || '#3498DB';
  
  // Convertir les couleurs hexadécimales en RGB pour jsPDF
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };
  
  const primaryRgb = hexToRgb(primaryColor);
  
  // Fonction pour résoudre les valeurs des champs
  const resolveFieldValue = (pattern: string) => {
    if (!pattern || typeof pattern !== 'string') {
      console.warn("Invalid pattern for field value:", pattern);
      return '';
    }
    
    try {
      return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
        const keyParts = key.split('.');
        let value = offer;
        
        for (const part of keyParts) {
          if (value === undefined || value === null) {
            return '';
          }
          value = value[part];
        }
        
        // Formater selon le type
        if (typeof value === 'number') {
          // Détecter si c'est une valeur monétaire
          if (key.includes('amount') || key.includes('payment') || key.includes('price') || key.includes('commission')) {
            return formatCurrency(value);
          }
          return value.toString();
        } else if (value instanceof Date || (typeof value === 'string' && Date.parse(value))) {
          return formatDate(value);
        }
        
        return value || 'Non renseigné';
      });
    } catch (error) {
      console.error("Error resolving field value for pattern:", pattern, error);
      return pattern; // Return original pattern on error
    }
  };
  
  // Appliquer le style de texte au champ
  const applyTextStyle = (doc, field) => {
    // Default style if none exists
    const defaultStyle = {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none'
    };
    
    const style = field.style || defaultStyle;
    
    // Set font size
    doc.setFontSize(style.fontSize || 10);
    
    // Set font style
    let fontStyle = 'normal';
    if (style.fontWeight === 'bold' && style.fontStyle === 'italic') {
      fontStyle = 'bolditalic';
    } else if (style.fontWeight === 'bold') {
      fontStyle = 'bold';
    } else if (style.fontStyle === 'italic') {
      fontStyle = 'italic';
    }
    
    doc.setFont('helvetica', fontStyle);
    
    // Note: Text decoration like underline needs to be handled separately when drawing text
    return style.textDecoration === 'underline';
  };

  try {
    // Vérifier si nous avons des images de template valides
    const hasTemplateImages = template?.templateImages && 
                            Array.isArray(template.templateImages) && 
                            template.templateImages.length > 0;
    
    console.log("Has template images:", hasTemplateImages, 
                template?.templateImages?.length || 0);
    
    if (hasTemplateImages) {
      console.log("Template has images, attempting to preload them");
      // Précharger les images de template
      const loadedImages = await preloadImages(template.templateImages);
      
      console.log(`Loaded ${loadedImages.length} images for PDF`);
      
      // Filter to keep only successfully loaded images
      const successfullyLoadedImages = loadedImages.filter(img => img.image);
      
      console.log(`Successfully loaded ${successfullyLoadedImages.length} out of ${loadedImages.length} images`);
      
      // Si aucune image n'a été chargée correctement, utiliser le modèle standard
      if (successfullyLoadedImages.length === 0) {
        console.warn("No template images were loaded successfully, falling back to standard template");
        generateStandardPdf(doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle);
      } else {
        // Trier les images par numéro de page
        const sortedImages = successfullyLoadedImages
          .sort((a, b) => (a.page || 0) - (b.page || 0));
        
        console.log(`Generating PDF with ${sortedImages.length} sorted images`);
        
        // Générer chaque page avec l'image correspondante
        sortedImages.forEach((pageImage, index) => {
          // Ajouter une nouvelle page si ce n'est pas la première
          if (index > 0) {
            doc.addPage();
          }
          
          // Ajouter l'image de fond
          try {
            console.log(`Adding image for page ${index + 1}`);
            
            if (!pageImage.image) {
              console.error(`Image for page ${index + 1} is null, skipping`);
              return;
            }
            
            const { width, height } = pageImage.image;
            
            if (!width || !height) {
              console.error(`Invalid image dimensions for page ${index + 1}: ${width}x${height}`);
              return;
            }
            
            // Ajuster les dimensions pour qu'elles tiennent sur la page A4
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            const ratio = Math.min(pageWidth / width, pageHeight / height);
            const scaledWidth = width * ratio;
            const scaledHeight = height * ratio;
            
            // Centrer l'image sur la page
            const offsetX = (pageWidth - scaledWidth) / 2;
            const offsetY = (pageHeight - scaledHeight) / 2;
            
            doc.addImage(pageImage.image, 'JPEG', offsetX, offsetY, scaledWidth, scaledHeight);
            
            console.log(`Added image for page ${index + 1}: ${scaledWidth}x${scaledHeight} at ${offsetX},${offsetY}`);
          } catch (error) {
            console.error(`Erreur lors de l'ajout de l'image pour la page ${index + 1}:`, error);
          }
          
          // Ajouter les champs pour cette page
          if (template?.fields && Array.isArray(template.fields)) {
            console.log(`Adding fields for page ${index + 1}`);
            
            const pageFields = template.fields
              .filter(field => {
                const isVisible = field.isVisible !== false;
                const isForThisPage = field.page === index || (index === 0 && field.page === undefined);
                const hasValidPosition = field.position && 
                                      typeof field.position.x === 'number' && 
                                      typeof field.position.y === 'number';
                
                if (isForThisPage && !hasValidPosition) {
                  console.warn(`Field ${field.id || 'unknown'} is for page ${index + 1} but has invalid position:`, field.position);
                }
                
                return isVisible && isForThisPage && hasValidPosition;
              });
            
            console.log(`Found ${pageFields.length} valid fields for page ${index + 1}`);
            
            pageFields.forEach((field, fieldIndex) => {
              // Double-check field position
              if (!field.position || typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
                console.warn(`Skipping field ${field.id || 'unknown'} due to invalid position:`, field.position);
                return;
              }
              
              console.log(`Processing field ${fieldIndex}: ${field.id || 'unknown'} at position (${field.position.x}, ${field.position.y})`);
              
              // Conversion des millimètres en points (unité utilisée par jsPDF)
              // 1 mm = 2.83464567 points
              const mmToPoints = (mm) => mm * 2.83464567;
              
              const x = mmToPoints(field.position.x || 0);
              const y = mmToPoints(field.position.y || 0);
              
              if (field.id === 'equipment_table') {
                // Tableau d'équipements - uniquement si nous sommes sur la page appropriée
                let equipmentItems = [];
                try {
                  if (offer.equipment_description) {
                    equipmentItems = typeof offer.equipment_description === 'string'
                      ? JSON.parse(offer.equipment_description)
                      : offer.equipment_description;
                  }
                } catch (e) {
                  console.error("Erreur lors de l'analyse des données d'équipement:", e);
                }
                
                if (equipmentItems && equipmentItems.length > 0) {
                  const tableHeaders = [['Désignation', 'Prix unitaire', 'Quantité', 'Marge', 'Total']];
                  
                  const tableData = equipmentItems.map((item: any) => {
                    const unitPrice = item.purchasePrice || 0;
                    const quantity = item.quantity || 1;
                    const margin = item.margin || 0;
                    const totalPrice = unitPrice * quantity * (1 + margin / 100);
                    
                    return [
                      item.title,
                      formatCurrency(unitPrice),
                      quantity.toString(),
                      `${margin}%`,
                      formatCurrency(totalPrice)
                    ];
                  });
                  
                  // Use field style for the table if available
                  const tableStyle = field.style || { fontSize: 9 };
                  
                  autoTable(doc, {
                    head: tableHeaders,
                    body: tableData,
                    startY: y,
                    theme: 'grid',
                    styles: { fontSize: tableStyle.fontSize || 9, cellPadding: 2 },
                    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b], textColor: [255, 255, 255] },
                    columnStyles: {
                      0: { cellWidth: 'auto' },
                      1: { cellWidth: 25, halign: 'right' },
                      2: { cellWidth: 15, halign: 'center' },
                      3: { cellWidth: 15, halign: 'center' },
                      4: { cellWidth: 25, halign: 'right' }
                    },
                    margin: { left: x }
                  });
                  
                  console.log(`Added equipment table at (${x}, ${y}) with ${equipmentItems.length} items`);
                }
              } else {
                // Texte simple avec style
                try {
                  // Apply text style
                  const needsUnderline = applyTextStyle(doc, field);
                  doc.setTextColor(0, 0, 0);
                  
                  // Resolve the value from the data
                  const resolvedValue = resolveFieldValue(field.value || '');
                  console.log(`Field ${field.id || 'unknown'}: "${field.value}" -> "${resolvedValue}"`);
                  
                  // Draw the text
                  doc.text(resolvedValue, x, y);
                  
                  // Add underline if needed
                  if (needsUnderline) {
                    const textWidth = doc.getTextWidth(resolvedValue);
                    const textHeight = field.style?.fontSize || 10;
                    const underlineY = y + 1; // Slight offset below text
                    doc.line(x, underlineY, x + textWidth, underlineY);
                  }
                  
                  console.log(`Added text field at (${x}, ${y}): "${resolvedValue}"`);
                } catch (error) {
                  console.error(`Error rendering field ${field.id || 'unknown'}:`, error);
                }
                
                // Réinitialiser la police
                doc.setFont('helvetica', 'normal');
              }
            });
          }
        });
        
        // Ajouter le pied de page sur la dernière page
        const lastPage = doc.getNumberOfPages();
        doc.setPage(lastPage);
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          template?.footerText || 
          'Cette offre est valable 30 jours à compter de sa date d\'émission. Cette offre est soumise à l\'acceptation finale du bailleur.',
          doc.internal.pageSize.getWidth() / 2, 
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
        
        doc.text(
          `${template?.companyName || 'iTakeCare'} - ${template?.companyAddress || 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique'}`,
          doc.internal.pageSize.getWidth() / 2, 
          doc.internal.pageSize.getHeight() - 15,
          { align: 'center' }
        );
        
        doc.text(
          `${template?.companySiret || 'TVA: BE 0795.642.894'} - ${template?.companyContact || 'Tel: +32 471 511 121 - Email: hello@itakecare.be'}`,
          doc.internal.pageSize.getWidth() / 2, 
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        
        console.log("Added footer to the last page");
      }
    } else {
      // Générer le PDF standard sans images de template
      console.log("No template images found, using standard template");
      generateStandardPdf(doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle);
    }
  } catch (error) {
    console.error("Error during PDF generation:", error);
    // If an error occurs during generation, fall back to the standard template
    try {
      console.log("FALLBACK: Using standard template due to error");
      // Reset the document to start fresh
      const doc = new jsPDF();
      generateStandardPdf(doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle);
    } catch (fallbackError) {
      console.error("Even fallback PDF generation failed:", fallbackError);
      throw new Error(`PDF generation failed completely: ${error.message}`);
    }
  }
  
  // Enregistrer le PDF avec un nom de fichier approprié
  const filename = `Offre_${offer.id.slice(0, 8)}_${offer.client_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  
  console.log(`PDF saved with filename: ${filename}`);
  return filename;
};

// Function to generate a standard PDF template without background images
const generateStandardPdf = (doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle) => {
  console.log("Generating standard PDF template");
  
  try {
    // Ajouter le logo de l'entreprise s'il existe
    if (template?.logoURL) {
      try {
        const img = new Image();
        img.src = template.logoURL;
        // Wait for image to load
        doc.addImage(template.logoURL, 'PNG', 10, 10, 40, 20);
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error);
      }
    }
    
    // Ajouter le titre du document
    doc.setFontSize(20);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    const headerText = template?.headerText?.replace('{offer_id}', `OFF-${offer.id.slice(0, 8)}`) || 
                      `OFFRE N° OFF-${offer.id.slice(0, 8)}`;
    doc.text(headerText, 105, 30, { align: 'center' });
    
    // Add client information
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Client: ${offer.client_name || 'Non spécifié'}`, 20, 50);
    doc.text(`Email: ${offer.client_email || 'Non spécifié'}`, 20, 60);
    doc.text(`Téléphone: ${offer.client_phone || 'Non spécifié'}`, 20, 70);
    
    // Add offer details
    doc.setFontSize(12);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text("Détails de l'offre", 20, 90);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Montant: ${offer.amount ? formatCurrency(offer.amount) : 'Non spécifié'}`, 20, 100);
    doc.text(`Mensualité: ${offer.monthly_payment ? formatCurrency(offer.monthly_payment) : 'Non spécifié'}`, 20, 110);
    doc.text(`Date de création: ${offer.created_at ? formatDate(offer.created_at) : 'Non spécifié'}`, 20, 120);
    
    // Add equipment section if available
    let equipmentItems = [];
    try {
      if (offer.equipment_description) {
        equipmentItems = typeof offer.equipment_description === 'string'
          ? JSON.parse(offer.equipment_description)
          : offer.equipment_description;
      }
    } catch (e) {
      console.error("Erreur lors de l'analyse des données d'équipement:", e);
    }
    
    if (equipmentItems && equipmentItems.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text('ÉQUIPEMENTS', 20, 140);
      
      const tableHeaders = [['Désignation', 'Prix unitaire', 'Quantité', 'Marge', 'Total']];
      
      const tableData = equipmentItems.map((item: any) => {
        const unitPrice = item.purchasePrice || 0;
        const quantity = item.quantity || 1;
        const margin = item.margin || 0;
        const totalPrice = unitPrice * quantity * (1 + margin / 100);
        
        return [
          item.title,
          formatCurrency(unitPrice),
          quantity.toString(),
          `${margin}%`,
          formatCurrency(totalPrice)
        ];
      });
      
      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 145,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 30, halign: 'right' }
        },
      });
    }
    
    // Add custom fields if specified
    if (template?.fields && Array.isArray(template.fields)) {
      const standardFields = template.fields.filter(field => 
        field.isVisible !== false && 
        (field.page === 0 || field.page === undefined) &&
        field.position && 
        typeof field.position.x === 'number' && 
        typeof field.position.y === 'number' &&
        field.id !== 'equipment_table' // Skip equipment table as we've already added it
      );
      
      console.log(`Adding ${standardFields.length} fields to standard PDF`);
      
      standardFields.forEach((field, idx) => {
        // Conversion des millimètres en points (unité utilisée par jsPDF)
        const mmToPoints = (mm) => mm * 2.83464567;
        
        const x = mmToPoints(field.position.x || 0);
        const y = mmToPoints(field.position.y || 0);
        
        console.log(`Adding field ${idx} at position (${x}, ${y})`);
        
        // Texte simple avec style
        const needsUnderline = applyTextStyle(doc, field);
        doc.setTextColor(0, 0, 0);
        
        try {
          const resolvedValue = resolveFieldValue(field.value || '');
          console.log(`Field value: "${field.value}" -> "${resolvedValue}"`);
          
          doc.text(resolvedValue, x, y);
          
          // Add underline if needed
          if (needsUnderline) {
            const textWidth = doc.getTextWidth(resolvedValue);
            const underlineY = y + 1; // Slight offset below text
            doc.line(x, underlineY, x + textWidth, underlineY);
          }
        } catch (error) {
          console.error(`Error rendering field ${field.id || 'unknown'}:`, error);
        }
        
        // Réinitialiser la police
        doc.setFont('helvetica', 'normal');
      });
    }
    
    // Ajouter le résumé en bas
    const finalY = (doc as any).lastAutoTable?.finalY + 20 || 200;
    
    doc.setFontSize(11);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text(`Montant total: ${formatCurrency(offer.amount || 0)}`, 150, finalY);
    doc.text(`Mensualité: ${formatCurrency(offer.monthly_payment || 0)}`, 150, finalY + 7);
    
    // Ajouter les conditions générales
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      template?.footerText || 
      'Cette offre est valable 30 jours à compter de sa date d\'émission. Cette offre est soumise à l\'acceptation finale du bailleur.',
      14, 270
    );
    
    // Ajouter le pied de page avec les informations de l'entreprise
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${template?.companyName || 'iTakeCare'} - ${template?.companyAddress || 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique'}`, 105, 280, { align: 'center' });
    doc.text(`${template?.companySiret || 'TVA: BE 0795.642.894'} - ${template?.companyContact || 'Tel: +32 471 511 121 - Email: hello@itakecare.be'}`, 105, 285, { align: 'center' });
  } catch (error) {
    console.error("Error generating standard PDF:", error);
    
    // Super basic fallback - at least create something
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("ERREUR: Impossible de générer le document correctement", 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Référence: ${offer.id || 'Inconnue'}`, 105, 50, { align: 'center' });
    doc.text(`Client: ${offer.client_name || 'Inconnu'}`, 105, 60, { align: 'center' });
    doc.text("Veuillez contacter l'administrateur système.", 105, 80, { align: 'center' });
  }
};
