
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

export const generateOfferPdf = async (offer: any) => {
  // Récupérer le modèle personnalisé
  const template = await getPDFTemplate();
  
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
  const secondaryRgb = hexToRgb(secondaryColor);
  
  // Ajouter le logo de l'entreprise s'il existe
  if (template?.logoURL) {
    try {
      const img = new Image();
      img.src = template.logoURL;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      
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
  
  // Ajouter les champs selon le modèle personnalisé
  if (template?.fields) {
    // Fonction pour ajouter un champ s'il est visible
    const addField = (fieldId: string, formatFn?: (value: any) => string) => {
      const field = template.fields.find(f => f.id === fieldId);
      if (field && field.isVisible) {
        const value = field.value.replace(/\{([^}]+)\}/g, (match, key) => {
          let fieldValue = key.split('.').reduce((o: any, i: string) => o?.[i], offer);
          return formatFn ? formatFn(fieldValue) : (fieldValue || 'Non renseigné');
        });
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(value, field.position.x, field.position.y);
      }
    };
    
    // Ajouter la date
    const dateField = template.fields.find(f => f.id === 'created_at');
    if (dateField && dateField.isVisible) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${formatDate(offer.created_at)}`, dateField.position.x, dateField.position.y, { align: 'right' });
    }
    
    // Ajouter la section d'information client
    if (template.fields.some(f => ['client_name', 'client_email', 'client_company'].includes(f.id) && f.isVisible)) {
      doc.setFontSize(12);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text('CLIENT', 14, 50);
      
      addField('client_name');
      addField('client_email');
      
      // Ajouter l'information de la société si elle existe
      if (offer.clients && offer.clients.company) {
        addField('client_company');
      }
    }
    
    // Ajouter la section détails de l'offre
    if (template.fields.some(f => ['amount', 'monthly_payment', 'coefficient'].includes(f.id) && f.isVisible)) {
      doc.setFontSize(12);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text('DÉTAILS DE L\'OFFRE', 14, 90);
      
      addField('amount', (value) => `Montant total: ${formatCurrency(value || 0)}`);
      addField('monthly_payment', (value) => `Paiement mensuel: ${formatCurrency(value || 0)}`);
      addField('coefficient', (value) => `Coefficient: ${value || 0}`);
    }
    
    // Ajouter le tableau des équipements
    const equipmentTableField = template.fields.find(f => f.id === 'equipment_table');
    if (equipmentTableField && equipmentTableField.isVisible) {
      // Analyser les éléments d'équipement
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
        doc.text('ÉQUIPEMENTS', 14, 130);
        
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
          startY: 135,
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
    }
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
  doc.text(`${template?.companyName || 'iTakeCare SAS'} - ${template?.companyAddress || '123 Avenue de la République - 75011 Paris'}`, 105, 280, { align: 'center' });
  doc.text(`${template?.companySiret || 'SIRET: 123 456 789 00011'} - ${template?.companyContact || 'contact@itakecare.fr - www.itakecare.fr'}`, 105, 285, { align: 'center' });
  
  // Enregistrer le PDF avec un nom de fichier approprié
  const filename = `Offre_${offer.id.slice(0, 8)}_${offer.client_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  
  return filename;
};
