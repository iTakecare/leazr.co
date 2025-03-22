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
  if (!templateImages || templateImages.length === 0) return [];
  
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };
  
  try {
    const imagePromises = templateImages.map(img => loadImage(img.url).then(image => ({ ...img, image })));
    return await Promise.all(imagePromises);
  } catch (error) {
    console.error("Erreur lors du préchargement des images:", error);
    return [];
  }
};

export const generateOfferPdf = async (offer: any) => {
  // Si l'offre contient déjà un template, l'utiliser (pour les aperçus)
  const template = offer.__template || await getPDFTemplate();
  
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
  };
  
  // Vérifier si nous avons des images de template
  const hasTemplateImages = template?.templateImages && template.templateImages.length > 0;
  
  if (hasTemplateImages) {
    // Précharger les images de template
    const loadedImages = await preloadImages(template.templateImages);
    
    // Trier les images par numéro de page
    const sortedImages = loadedImages.sort((a, b) => a.page - b.page);
    
    // Générer chaque page avec l'image correspondante
    sortedImages.forEach((pageImage, index) => {
      // Ajouter une nouvelle page si ce n'est pas la première
      if (index > 0) {
        doc.addPage();
      }
      
      // Ajouter l'image de fond
      try {
        const { width, height } = pageImage.image;
        
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
      } catch (error) {
        console.error(`Erreur lors de l'ajout de l'image pour la page ${index + 1}:`, error);
      }
      
      // Ajouter les champs pour cette page
      if (template?.fields) {
        template.fields
          .filter(field => field.isVisible && (field.page === index || field.page === null))
          .forEach(field => {
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
                
                autoTable(doc, {
                  head: tableHeaders,
                  body: tableData,
                  startY: y,
                  theme: 'grid',
                  styles: { fontSize: 8, cellPadding: 2 },
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
              }
            } else {
              // Texte simple
              doc.setFontSize(10);
              doc.setTextColor(0, 0, 0);
              
              if (field.category === 'offer' && field.type === 'currency') {
                doc.setFont('helvetica', 'bold');
              }
              
              const resolvedValue = resolveFieldValue(field.value);
              doc.text(resolvedValue, x, y);
              
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
    
  } else {
    // Générer le PDF standard sans images de template
    
    // Ajouter le logo de l'entreprise s'il existe
    if (template?.logoURL) {
      try {
        const img = new Image();
        img.src = template.logoURL;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        
        // Si l'image est une URL data
        if (template.logoURL.startsWith('data:')) {
          doc.addImage(template.logoURL, 'PNG', 10, 10, 40, 20);
        } else {
          doc.addImage(template.logoURL, 'PNG', 10, 10, 40, 20);
        }
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
    
    // Ajouter les champs selon le modèle personnalisé
    if (template?.fields) {
      // Parcourir tous les champs visibles et les ajouter au PDF
      template.fields
        .filter(field => field.isVisible && (field.page === 0 || field.page === null))
        .forEach(field => {
          // Positionner les coordonnées du champ
          const x = field.position.x;
          const y = field.position.y;
          
          if (field.id === 'equipment_table') {
            // Cas spécial pour le tableau d'équipements
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
              doc.text('ÉQUIPEMENTS', x, y);
              
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
                startY: y + 5,
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
          } else {
            // Pour les autres types de champs, ajouter du texte
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            if (field.category === 'offer' && field.type === 'currency') {
              doc.setFont('helvetica', 'bold');
            }
            
            const resolvedValue = resolveFieldValue(field.value);
            doc.text(resolvedValue, x, y);
            
            // Réinitialiser la police
            doc.setFont('helvetica', 'normal');
          }
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
  }
  
  // Enregistrer le PDF avec un nom de fichier approprié
  const filename = `Offre_${offer.id.slice(0, 8)}_${offer.client_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  
  return filename;
};
