import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from '@/utils/formatters';
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
    
    console.log("Modèle PDF récupéré:", {
      nom: data?.name,
      nbChamps: Array.isArray(data?.fields) ? data.fields.length : 0,
      nbImages: Array.isArray(data?.templateImages) ? data.templateImages.length : 0
    });
    
    return data || null;
  } catch (error) {
    console.error("Erreur lors de la récupération du modèle PDF:", error);
    return null;
  }
};

// Précharger les images des modèles
const preloadImages = async (templateImages) => {
  if (!templateImages || templateImages.length === 0) {
    console.log("Aucune image de modèle à précharger");
    return [];
  }
  
  console.log(`Tentative de préchargement de ${templateImages.length} images`);
  
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      if (!url || typeof url !== 'string' || url.length < 10) {
        console.error("URL d'image invalide:", url);
        reject(new Error("URL d'image invalide"));
        return;
      }
      
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      // Définir un délai pour éviter les blocages
      const timeout = setTimeout(() => {
        console.error(`Délai de chargement d'image dépassé: ${url.substring(0, 50)}...`);
        reject(new Error("Délai de chargement d'image dépassé"));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`Image chargée avec succès: ${url.substring(0, 50)}...`);
        resolve(img);
      };
      
      img.onerror = (err) => {
        clearTimeout(timeout);
        console.error(`Échec du chargement de l'image: ${url.substring(0, 50)}...`, err);
        reject(err);
      };
      
      img.src = url;
    });
  };
  
  try {
    // Filtrer d'abord les entrées avec des données d'image invalides
    const validTemplateImages = templateImages.filter(img => 
      img && (img.data || img.url) && typeof (img.data || img.url) === 'string'
    );
    
    if (validTemplateImages.length === 0) {
      console.error("Aucune image de modèle valide trouvée après filtrage");
      return [];
    }
    
    console.log(`Chargement de ${validTemplateImages.length} images valides`);
    
    const imagePromises = validTemplateImages.map(img => {
      const imageUrl = img.data || img.url;
      return loadImage(imageUrl)
        .then(image => ({ ...img, image }))
        .catch(err => {
          console.error(`Erreur de chargement d'image pour la page ${img.page}:`, err);
          return { ...img, image: null, loadError: err.message || "Erreur inconnue" };
        });
    });
    
    const results = await Promise.all(imagePromises);
    
    // Compter les images chargées avec succès
    const successCount = results.filter(r => r.image).length;
    console.log(`${successCount} images sur ${templateImages.length} chargées avec succès`);
    
    return results;
  } catch (error) {
    console.error("Erreur pendant le préchargement des images:", error);
    return [];
  }
};

export const generateOfferPdf = async (offer: any) => {
  console.log("Débogage génération PDF: Démarrage de la génération PDF");
  console.log("Débogage génération PDF: Clés de l'objet offre:", Object.keys(offer));
  
  // Si l'offre contient déjà un template, l'utiliser (pour les aperçus)
  const template = offer.__template || await getPDFTemplate();
  
  if (!template) {
    console.error("DÉBOGAGE CRITIQUE: Aucun modèle disponible pour la génération PDF");
    throw new Error("Aucun modèle disponible pour la génération PDF");
  }
  
  console.log("Débogage génération PDF: Modèle chargé", {
    nom: template.name,
    nbChamps: Array.isArray(template.fields) ? template.fields.length : 0,
    nbImages: Array.isArray(template.templateImages) ? template.templateImages.length : 0
  });

  // Afficher les détails des champs pour le débogage
  if (Array.isArray(template.fields) && template.fields.length > 0) {
    console.log("Débogage champs du modèle:");
    template.fields.forEach((field, idx) => {
      console.log(`Champ ${idx}: ${field.id || 'sans-id'} - Valeur: "${field.value}" - Position: ${JSON.stringify(field.position || 'non définie')}`);
    });
  } else {
    console.error("Aucun champ défini dans le modèle ou format invalide");
  }

  // Supprimer le template de l'offre si présent (pour éviter de le stocker)
  if (offer.__template) {
    delete offer.__template;
  }
  
  // Créer un nouveau document PDF
  const doc = new jsPDF();
  
  // Définir les propriétés du document
  doc.setProperties({
    title: `Offre ${offer.id ? offer.id.slice(0, 8) : 'sans id'}`,
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
  
  // Fonction pour résoudre les valeurs des champs avec plus de détails de débogage
  const resolveFieldValue = (pattern: string) => {
    if (!pattern || typeof pattern !== 'string') {
      console.warn(`Motif invalide: ${pattern}`);
      return '';
    }
    
    try {
      console.log(`Résolution du motif: "${pattern}"`);
      
      // Traitement spécial pour les champs d'équipement
      if (pattern === '{equipment_description}') {
        try {
          let equipmentData;
          
          // Essayer de récupérer les données d'équipement
          if (offer.equipment_description) {
            if (typeof offer.equipment_description === 'string') {
              try {
                equipmentData = JSON.parse(offer.equipment_description);
              } catch (e) {
                console.error("Erreur lors du parse des données d'équipement:", e);
              }
            } else {
              equipmentData = offer.equipment_description;
            }
            
            // Si nous avons des données d'équipement, formater la sortie
            if (Array.isArray(equipmentData) && equipmentData.length > 0) {
              const formattedItems = equipmentData.map(item => 
                `• ${item.title || 'Produit'}: ${formatCurrency(item.purchasePrice || 0)} × ${item.quantity || 1} (Marge: ${item.margin || 0}%)`
              ).join('\n');
              
              console.log("Équipement formaté pour affichage:", formattedItems);
              return formattedItems;
            }
          }
          
          return "Aucun équipement spécifié";
        } catch (error) {
          console.error("Erreur lors du formatage des équipements:", error);
          return "Erreur lors de l'affichage des équipements";
        }
      }
      
      // Traitement spécial pour monthly_payment
      if (pattern === '{offer_monthly_payment}' || pattern === '{monthly_payment}') {
        const payment = offer.monthly_payment || 0;
        return formatCurrency(payment);
      }
      
      // Traitement spécial pour la date
      if (pattern === '{created_at}' || pattern.includes('created_at')) {
        if (offer.created_at) {
          const date = new Date(offer.created_at);
          // S'assurer que la date est valide
          if (!isNaN(date.getTime())) {
            return formatDate(date);
          }
        }
        return formatDate(new Date()); // Date actuelle comme fallback
      }
      
      // Résoudre les placeholders avec une syntaxe {clé}
      const resolvedValue = pattern.replace(/\{([^}]+)\}/g, (match, key) => {
        console.log(`Tentative de résolution de la clé: ${key}`);
        
        // Support pour la notation avec points (obj.prop)
        const keyParts = key.split('.');
        let value = offer;
        
        for (const part of keyParts) {
          console.log(`Recherche de la partie: ${part}`);
          if (value === undefined || value === null) {
            console.warn(`Valeur indéfinie pour la partie de clé: ${part}`);
            return '[Non disponible]';
          }
          value = value[part];
        }
        
        console.log(`Valeur trouvée pour ${key}:`, value);
        
        // Formater selon le type
        if (typeof value === 'number') {
          // Détecter si c'est une valeur monétaire
          if (key.includes('amount') || key.includes('payment') || key.includes('price') || key.includes('commission')) {
            const formatted = formatCurrency(value);
            console.log(`Formatage monétaire appliqué: ${value} -> ${formatted}`);
            return formatted;
          }
          return value.toString();
        } else if (value instanceof Date || (typeof value === 'string' && Date.parse(value))) {
          const formatted = formatDate(value);
          console.log(`Formatage de date appliqué: ${value} -> ${formatted}`);
          return formatted;
        }
        
        // Si la valeur est vide ou nulle, renvoyer une chaîne par défaut
        if (value === undefined || value === null || value === '') {
          console.warn(`Valeur manquante pour ${key}`);
          return '[Non disponible]';
        }
        
        // Renvoyer la valeur telle quelle (convertie en chaîne si nécessaire)
        return String(value);
      });
      
      console.log(`Résolution finale: "${pattern}" -> "${resolvedValue}"`);
      return resolvedValue;
    } catch (error) {
      console.error(`Erreur lors de la résolution de la valeur du champ pour le motif ${pattern}:`, error);
      return `[Erreur: ${pattern}]`; // Retourner un message d'erreur visible
    }
  };
  
  // Appliquer le style de texte au champ
  const applyTextStyle = (doc, field) => {
    // Style par défaut si aucun n'existe
    const defaultStyle = {
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000'
    };
    
    const style = field.style || defaultStyle;
    
    // Définir la taille de police
    doc.setFontSize(style.fontSize || 10);
    
    // Définir le style de police
    let fontStyle = 'normal';
    if (style.fontWeight === 'bold' && style.fontStyle === 'italic') {
      fontStyle = 'bolditalic';
    } else if (style.fontWeight === 'bold') {
      fontStyle = 'bold';
    } else if (style.fontStyle === 'italic') {
      fontStyle = 'italic';
    }
    
    doc.setFont('helvetica', fontStyle);
    
    // Définir la couleur du texte si spécifiée
    if (style.color) {
      const textRgb = hexToRgb(style.color);
      doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    } else {
      // Couleur par défaut (noir)
      doc.setTextColor(0, 0, 0);
    }
    
    // Retourner si le texte doit être souligné
    return style.textDecoration === 'underline';
  };

  try {
    // Vérifier si nous avons des images de template valides
    const hasTemplateImages = template?.templateImages && 
                            Array.isArray(template.templateImages) && 
                            template.templateImages.length > 0;
    
    console.log(`Images de template: ${hasTemplateImages ? 'OUI' : 'NON'}, ${template?.templateImages?.length || 0} images`);
    
    if (hasTemplateImages) {
      console.log("Template a des images, préchargement en cours");
      // Précharger les images de template
      const loadedImages = await preloadImages(template.templateImages);
      
      console.log(`${loadedImages.length} images chargées pour le PDF`);
      
      // Filtrer pour ne garder que les images chargées avec succès
      const successfullyLoadedImages = loadedImages.filter(img => img.image);
      
      console.log(`${successfullyLoadedImages.length} sur ${loadedImages.length} images chargées avec succès`);
      
      // Si aucune image n'a été chargée correctement, utiliser le modèle standard
      if (successfullyLoadedImages.length === 0) {
        console.warn("Aucune image de template n'a été chargée avec succès, utilisation du modèle standard");
        generateStandardPdf(doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle);
      } else {
        // Trier les images par numéro de page
        const sortedImages = successfullyLoadedImages
          .sort((a, b) => (a.page || 0) - (b.page || 0));
        
        console.log(`Génération du PDF avec ${sortedImages.length} images triées`);
        
        // Générer chaque page avec l'image correspondante
        sortedImages.forEach((pageImage, index) => {
          // Ajouter une nouvelle page si ce n'est pas la première
          if (index > 0) {
            doc.addPage();
          }
          
          // Ajouter l'image de fond
          try {
            console.log(`Ajout de l'image pour la page ${index + 1}`);
            
            if (!pageImage.image) {
              console.error(`Image pour la page ${index + 1} est null, ignorée`);
              return;
            }
            
            const { width, height } = pageImage.image;
            
            if (!width || !height) {
              console.error(`Dimensions d'image invalides pour la page ${index + 1}: ${width}x${height}`);
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
            
            console.log(`Image ajoutée pour la page ${index + 1}: ${scaledWidth}x${scaledHeight} à ${offsetX},${offsetY}`);
          } catch (error) {
            console.error(`Erreur lors de l'ajout de l'image pour la page ${index + 1}:`, error);
          }
          
          // Ajouter les champs pour cette page
          if (template?.fields && Array.isArray(template.fields)) {
            console.log(`Ajout des champs pour la page ${index + 1}`);
            
            const pageFields = template.fields
              .filter(field => {
                if (!field) {
                  console.warn("Champ invalide trouvé (null ou undefined)");
                  return false;
                }
                
                const isVisible = field.isVisible !== false;
                const isForThisPage = field.page === index || (index === 0 && field.page === undefined);
                const hasValidPosition = field.position && 
                                      typeof field.position.x === 'number' && 
                                      typeof field.position.y === 'number';
                
                if (isForThisPage && !hasValidPosition) {
                  console.warn(`Champ ${field.id || 'unknown'} est pour la page ${index + 1} mais a une position invalide:`, field.position);
                }
                
                return isVisible && isForThisPage && hasValidPosition;
              });
            
            console.log(`${pageFields.length} champs valides trouvés pour la page ${index + 1}`);
            
            // Liste détaillée des champs filtrés pour la page
            if (pageFields.length > 0) {
              console.log("Détail des champs pour cette page:");
              pageFields.forEach((f, i) => {
                console.log(`  ${i+1}. ID: ${f.id || 'sans-id'}, Label: ${f.label || 'sans-label'}, Position: (${f.position?.x || '?'}, ${f.position?.y || '?'})`);
              });
            }
            
            pageFields.forEach((field, fieldIndex) => {
              // Double vérification de la position du champ
              if (!field.position || typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
                console.warn(`Ignoré champ ${field.id || 'unknown'} à cause d'une position invalide:`, field.position);
                return;
              }
              
              console.log(`Traitement du champ ${fieldIndex}: ${field.id || 'unknown'} à la position (${field.position.x}, ${field.position.y})`);
              
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
                      
                    console.log(`Équipements extraits: ${equipmentItems.length} items`);
                  }
                } catch (e) {
                  console.error("Erreur lors de l'analyse des données d'équipement:", e);
                }
                
                if (equipmentItems && equipmentItems.length > 0) {
                  const tableHeaders = [['Désignation', 'Quantité', 'Mensualité']];
                  
                  const tableData = equipmentItems.map((item: any) => {
                    const quantity = item.quantity || 1;
                    let monthlyPayment = 0;
                    
                    if (item.monthlyPayment) {
                      monthlyPayment = parseFloat(item.monthlyPayment) * quantity;
                    } else {
                      // Calculer une mensualité approximative
                      const unitPrice = parseFloat(item.purchasePrice || 0);
                      monthlyPayment = (unitPrice * quantity) / 36; // Diviser par 36 mois
                    }
                    
                    return [
                      item.title,
                      quantity.toString(),
                      formatCurrency(monthlyPayment)
                    ];
                  });
                  
                  // Calculer le total des mensualités
                  const totalMonthlyPayment = equipmentItems.reduce((total, item) => {
                    const quantity = parseInt(item.quantity || 1);
                    if (item.monthlyPayment) {
                      return total + (parseFloat(item.monthlyPayment) * quantity);
                    } else {
                      const unitPrice = parseFloat(item.purchasePrice || 0);
                      return total + ((unitPrice * quantity) / 36);
                    }
                  }, 0);
                  
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
                      1: { cellWidth: 20, halign: 'center' },
                      2: { cellWidth: 25, halign: 'right' }
                    },
                    margin: { left: x },
                    foot: [['Total mensualité', '', formatCurrency(totalMonthlyPayment)]],
                    footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
                  });
                  
                  console.log(`Tableau d'équipements ajouté à (${x}, ${y}) avec ${equipmentItems.length} items`);
                }
              } else {
                // Texte simple avec style
                try {
                  // Résoudre la valeur à partir des données
                  const resolvedValue = resolveFieldValue(field.value || '');
                  console.log(`Champ ${field.id || 'unknown'}: "${field.value}" -> "${resolvedValue}"`);
                  
                  // Appliquer le style de texte
                  const needsUnderline = applyTextStyle(doc, field);
                  
                  // Dessiner le texte
                  doc.text(resolvedValue, x, y);
                  
                  // Ajouter un soulignement si nécessaire
                  if (needsUnderline) {
                    const textWidth = doc.getTextWidth(resolvedValue);
                    const underlineY = y + 1; // Léger décalage sous le texte
                    doc.line(x, underlineY, x + textWidth, underlineY);
                  }
                  
                  console.log(`Champ texte ajouté à (${x}, ${y}): "${resolvedValue}"`);
                } catch (error) {
                  console.error(`Erreur lors du rendu du champ ${field.id || 'unknown'}:`, error);
                }
                
                // Réinitialiser la police
                doc.setFont('helvetica', 'normal');
              }
            });
          } else {
            console.warn(`Aucun champ trouvé dans le template pour la page ${index + 1}`);
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
        
        console.log("Pied de page ajouté à la dernière page");
      }
    } else {
      // Générer le PDF standard sans images de template
      console.log("Aucune image de template trouvée, utilisation du modèle standard");
      generateStandardPdf(doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle);
    }
  } catch (error) {
    console.error("Erreur pendant la génération du PDF:", error);
    // En cas d'erreur pendant la génération, utiliser le modèle standard
    try {
      console.log("SOLUTION DE SECOURS: Utilisation du modèle standard en raison d'une erreur");
      // Réinitialiser le document pour repartir de zéro
      const doc = new jsPDF();
      generateStandardPdf(doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle);
    } catch (fallbackError) {
      console.error("Même la génération de secours a échoué:", fallbackError);
      throw new Error(`La génération du PDF a complètement échoué: ${error.message}`);
    }
  }
  
  // Enregistrer le PDF avec un nom de fichier approprié
  const filename = `Offre_${offer.id ? offer.id.slice(0, 8) : 'exemple'}_${(offer.client_name || 'Client').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  
  console.log(`PDF enregistré avec le nom de fichier: ${filename}`);
  return filename;
};

// Fonction pour générer un modèle PDF standard sans images d'arrière-plan
const generateStandardPdf = (doc, offer, template, primaryRgb, resolveFieldValue, applyTextStyle) => {
  console.log("Génération du modèle PDF standard");
  
  try {
    // Afficher les données disponibles
    console.log("Données disponibles pour le PDF standard:", {
      offerId: offer.id ? offer.id.slice(0, 8) : 'sans-id',
      clientName: offer.client_name,
      amount: offer.amount,
      monthlyPayment: offer.monthly_payment
    });
    
    // Ajouter le logo de l'entreprise s'il existe
    if (template?.logoURL) {
      try {
        const img = new Image();
        img.src = template.logoURL;
        // Attendre que l'image se charge
        console.log("Ajout du logo:", template.logoURL);
        doc.addImage(template.logoURL, 'PNG', 10, 10, 40, 20);
      } catch (error) {
        console.error("Erreur lors du chargement du logo:", error);
      }
    }
    
    // Ajouter le titre du document
    doc.setFontSize(20);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    const headerText = template?.headerText?.replace('{offer_id}', `OFF-${offer.id ? offer.id.slice(0, 8) : 'exemple'}`) || 
                      `OFFRE N° OFF-${offer.id ? offer.id.slice(0, 8) : 'exemple'}`;
    doc.text(headerText, 105, 30, { align: 'center' });
    
    // Ajouter les informations du client
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Client: ${offer.client_name || 'Non spécifié'}`, 20, 50);
    doc.text(`Email: ${offer.client_email || 'Non spécifié'}`, 20, 60);
    doc.text(`Téléphone: ${offer.client_phone || 'Non spécifié'}`, 20, 70);
    
    // Ajouter les détails de l'offre (simplifié, sans coefficient)
    doc.setFontSize(12);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text("Détails de l'offre", 20, 90);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Montant: ${offer.amount ? formatCurrency(offer.amount) : 'Non spécifié'}`, 20, 100);
    doc.text(`Mensualité: ${offer.monthly_payment ? formatCurrency(offer.monthly_payment) : 'Non spécifié'}`, 20, 110);
    
    // Formater correctement la date
    let dateText = 'Non spécifié';
    if (offer.created_at) {
      try {
        const offerDate = new Date(offer.created_at);
        if (!isNaN(offerDate.getTime())) {
          dateText = formatDate(offerDate);
        }
      } catch (e) {
        console.error("Erreur de formatage de date:", e);
      }
    }
    
    doc.text(`Date de création: ${dateText}`, 20, 120);
    
    // Ajouter la section équipement si disponible
    let equipmentItems = [];
    try {
      if (offer.equipment_description) {
        equipmentItems = typeof offer.equipment_description === 'string'
          ? JSON.parse(offer.equipment_description)
          : offer.equipment_description;
          
        console.log(`Équipements extraits (standard): ${equipmentItems.length} items`);
      }
    } catch (e) {
      console.error("Erreur lors de l'analyse des données d'équipement:", e);
    }
    
    if (equipmentItems && equipmentItems.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text('ÉQUIPEMENTS', 20, 140);
      
      const tableHeaders = [['Désignation', 'Qté', 'Mensualité']];
      
      const tableData = equipmentItems.map((item) => {
        const quantity = item.quantity || 1;
        let monthlyPayment = 0;
        
        if (item.monthlyPayment) {
          monthlyPayment = parseFloat(item.monthlyPayment) * quantity;
        } else {
          // Calculer une mensualité approximative
          const unitPrice = parseFloat(item.purchasePrice || 0);
          monthlyPayment = (unitPrice * quantity) / 36; // Diviser par 36 mois
        }
        
        return [
          item.title,
          quantity.toString(),
          formatCurrency(monthlyPayment)
        ];
      });
      
      // Calculer le total des mensualités
      const totalMonthlyPayment = equipmentItems.reduce((total, item) => {
        const quantity = parseInt(item.quantity || 1);
        if (item.monthlyPayment) {
          return total + (parseFloat(item.monthlyPayment) * quantity);
        } else {
          const unitPrice = parseFloat(item.purchasePrice || 0);
          return total + ((unitPrice * quantity) / 36);
        }
      }, 0);
      
      // Ne plus ajouter une ligne de total ici pour éviter la duplication      
      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 145,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' }
        },
        foot: [['Total mensualité', '', formatCurrency(totalMonthlyPayment)]],
        footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
      });
    }
    
    // Ajouter les champs personnalisés si spécifiés
    if (template?.fields && Array.isArray(template.fields)) {
      const standardFields = template.fields.filter(field => 
        field.isVisible !== false && 
        (field.page === 0 || field.page === undefined) &&
        field.position && 
        typeof field.position.x === 'number' && 
        typeof field.position.y === 'number' &&
        field.id !== 'equipment_table' // Ignorer le tableau d'équipement car déjà ajouté
      );
      
      console.log(`Ajout de ${standardFields.length} champs au PDF standard`);
      
      standardFields.forEach((field, idx) => {
        // Conversion des millimètres en points (unité utilisée par jsPDF)
        const mmToPoints = (mm) => mm * 2.83464567;
        
        const x = mmToPoints(field.position.x || 0);
        const y = mmToPoints(field.position.y || 0);
        
        console.log(`Ajout du champ ${idx} à la position (${x}, ${y})`);
        
        try {
          // Texte simple avec style
          const needsUnderline = applyTextStyle(doc, field);
          
          // Résoudre la valeur
          const resolvedValue = resolveFieldValue(field.value || '');
          console.log(`Valeur du champ: "${field.value}" -> "${resolvedValue}"`);
          
          doc.text(resolvedValue, x, y);
          
          // Ajouter un soulignement si nécessaire
          if (needsUnderline) {
            const textWidth = doc.getTextWidth(resolvedValue);
            const underlineY = y + 1; // Léger décalage sous le texte
            doc.line(x, underlineY, x + textWidth, underlineY);
          }
        } catch (error) {
          console.error(`Erreur lors du rendu du champ ${field.id || 'unknown'}:`, error);
        }
        
        // Réinitialiser la police
        doc.setFont('helvetica', 'normal');
      });
    }
    
    // Ajouter le résumé en bas - avec un formatage correct
    const finalY = (doc.lastAutoTable?.finalY + 20) || 200;
    
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
    console.error("Erreur lors de la génération du PDF standard:", error);
    
    // Solution de secours super basique - au moins créer quelque chose
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("ERREUR: Impossible de générer le document correctement", 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Référence: ${offer.id || 'Inconnue'}`, 105, 50, { align: 'center' });
    doc.text(`Client: ${offer.client_name || 'Inconnu'}`, 105, 60, { align: 'center' });
    doc.text("Veuillez contacter l'administrateur système.", 105, 80, { align: 'center' });
  }
};

