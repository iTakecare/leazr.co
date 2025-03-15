
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Define the PDF template interface
interface PDFTemplate {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL: string | null;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  fields: Array<{
    id: string;
    isVisible: boolean;
    position: { x: number; y: number };
    value?: string;
  }>;
}

// Default template to use if no custom template is found
const DEFAULT_PDF_TEMPLATE: PDFTemplate = {
  id: 'default',
  name: 'Default template',
  companyName: 'iTakeCare',
  companyAddress: '123 Avenue de la République - 75011 Paris',
  companyContact: 'contact@itakecare.fr - www.itakecare.fr',
  companySiret: 'SIRET: 123 456 789 00011',
  logoURL: null,
  primaryColor: '#2C3E50',
  secondaryColor: '#3498DB',
  headerText: 'OFFRE N° {offer_id}',
  footerText: 'Cette offre est valable 30 jours à compter de sa date d\'émission. Cette offre est soumise à l\'acceptation finale du bailleur.',
  fields: [
    { id: 'created_at', isVisible: true, position: { x: 170, y: 40 } },
    { id: 'client_name', isVisible: true, position: { x: 14, y: 60 }, value: '{client_name}' },
    { id: 'client_email', isVisible: true, position: { x: 14, y: 70 }, value: '{client_email}' },
    { id: 'client_company', isVisible: true, position: { x: 14, y: 80 }, value: '{clients.company}' },
    { id: 'amount', isVisible: true, position: { x: 14, y: 100 }, value: 'Montant total: {amount}' },
    { id: 'monthly_payment', isVisible: true, position: { x: 14, y: 110 }, value: 'Paiement mensuel: {monthly_payment}' },
    { id: 'coefficient', isVisible: true, position: { x: 14, y: 120 }, value: 'Coefficient: {coefficient}' },
    { id: 'equipment_table', isVisible: true, position: { x: 14, y: 135 } }
  ]
};

// Function to retrieve the PDF template from the database
const getPDFTemplate = async (): Promise<PDFTemplate> => {
  try {
    // Check if table exists using SQL function
    const { data: tableExists, error: tableCheckError } = await supabase
      .rpc('check_table_exists', { table_name: 'pdf_templates' });
    
    if (tableCheckError || !tableExists) {
      console.log("Table pdf_templates doesn't exist or error checking it");
      return DEFAULT_PDF_TEMPLATE;
    }
    
    try {
      // Use the custom query method since the table might not be in TypeScript types
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      
      if (error || !data) {
        console.log("No custom template found, using default");
        return DEFAULT_PDF_TEMPLATE;
      }
      
      return data as unknown as PDFTemplate;
    } catch (err) {
      console.error("Error fetching template:", err);
      return DEFAULT_PDF_TEMPLATE;
    }
  } catch (error) {
    console.error("Error in getPDFTemplate:", error);
    return DEFAULT_PDF_TEMPLATE;
  }
};

export const generateOfferPdf = async (offer: any) => {
  // Get the custom template or use the default template
  const template = await getPDFTemplate();
  
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Set the document properties
  doc.setProperties({
    title: `Offre ${offer.id.slice(0, 8)}`,
    subject: 'Offre commerciale',
    author: template?.companyName || 'iTakeCare',
    keywords: 'offre, leasing, équipement',
    creator: template?.companyName || 'iTakeCare Plateforme'
  });
  
  // Set the main colors according to the template
  const primaryColor = template?.primaryColor || '#2C3E50';
  const secondaryColor = template?.secondaryColor || '#3498DB';
  
  // Convert hexadecimal colors to RGB for jsPDF
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
  
  // Add the company logo if it exists
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
      console.error("Error loading logo:", error);
    }
  }
  
  // Add the document title
  doc.setFontSize(20);
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  const headerText = template?.headerText?.replace('{offer_id}', `OFF-${offer.id.slice(0, 8)}`) || 
                    `OFFRE N° OFF-${offer.id.slice(0, 8)}`;
  doc.text(headerText, 105, 30, { align: 'center' });
  
  // Add fields according to the custom template
  if (template?.fields) {
    // Add date field
    const dateField = template.fields.find(f => f.id === 'created_at');
    if (dateField && dateField.isVisible) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${formatDate(offer.created_at)}`, dateField.position.x, dateField.position.y, { align: 'right' });
    }
    
    // Client information section
    const clientNameField = template.fields.find(f => f.id === 'client_name');
    const clientEmailField = template.fields.find(f => f.id === 'client_email');
    const clientCompanyField = template.fields.find(f => f.id === 'client_company');
    
    if ((clientNameField || clientEmailField || clientCompanyField) && 
        (clientNameField?.isVisible || clientEmailField?.isVisible || clientCompanyField?.isVisible)) {
      doc.setFontSize(12);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text('CLIENT', 14, 50);
      
      // Client name
      if (clientNameField?.isVisible) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(offer.client_name || 'Non renseigné', 14, 60);
      }
      
      // Client email
      if (clientEmailField?.isVisible) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(offer.client_email || 'Non renseigné', 14, 70);
      }
      
      // Client company
      if (clientCompanyField?.isVisible && offer.clients && offer.clients.company) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(offer.clients.company, 14, 80);
      }
    }
    
    // Offer details section
    const amountField = template.fields.find(f => f.id === 'amount');
    const monthlyPaymentField = template.fields.find(f => f.id === 'monthly_payment');
    const coefficientField = template.fields.find(f => f.id === 'coefficient');
    
    if ((amountField || monthlyPaymentField || coefficientField) &&
        (amountField?.isVisible || monthlyPaymentField?.isVisible || coefficientField?.isVisible)) {
      doc.setFontSize(12);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text('DÉTAILS DE L\'OFFRE', 14, 90);
      
      // Amount
      if (amountField?.isVisible) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Montant total: ${formatCurrency(Number(offer.amount) || 0)}`, 14, 100);
      }
      
      // Monthly payment
      if (monthlyPaymentField?.isVisible) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Paiement mensuel: ${formatCurrency(Number(offer.monthly_payment) || 0)}`, 14, 110);
      }
      
      // Coefficient
      if (coefficientField?.isVisible) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Coefficient: ${Number(offer.coefficient) || 0}`, 14, 120);
      }
    }
    
    // Equipment table
    const equipmentTableField = template.fields.find(f => f.id === 'equipment_table');
    if (equipmentTableField?.isVisible) {
      // Parse equipment items
      let equipmentItems = [];
      try {
        if (offer.equipment_description) {
          equipmentItems = typeof offer.equipment_description === 'string'
            ? JSON.parse(offer.equipment_description)
            : offer.equipment_description;
        }
      } catch (e) {
        console.error("Error parsing equipment data:", e);
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
  
  // Add summary at the bottom
  const finalY = (doc as any).lastAutoTable?.finalY + 20 || 200;
  
  doc.setFontSize(11);
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text(`Montant total: ${formatCurrency(Number(offer.amount) || 0)}`, 150, finalY);
  doc.text(`Mensualité: ${formatCurrency(Number(offer.monthly_payment) || 0)}`, 150, finalY + 7);
  
  // Add general terms
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    template?.footerText || 
    'Cette offre est valable 30 jours à compter de sa date d\'émission. Cette offre est soumise à l\'acceptation finale du bailleur.',
    14, 270
  );
  
  // Add footer with company information
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${template?.companyName || 'iTakeCare SAS'} - ${template?.companyAddress || '123 Avenue de la République - 75011 Paris'}`, 105, 280, { align: 'center' });
  doc.text(`${template?.companySiret || 'SIRET: 123 456 789 00011'} - ${template?.companyContact || 'contact@itakecare.fr - www.itakecare.fr'}`, 105, 285, { align: 'center' });
  
  // Save the PDF with an appropriate filename
  const filename = `Offre_${offer.id.slice(0, 8)}_${offer.client_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  
  return filename;
};
