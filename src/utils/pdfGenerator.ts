
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from '@/lib/utils';

export const generateOfferPdf = (offer: any) => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `Offre ${offer.id.slice(0, 8)}`,
    subject: 'Offre commerciale',
    author: 'iTakeCare',
    keywords: 'offre, leasing, équipement',
    creator: 'iTakeCare Plateforme'
  });
  
  // Add company logo (placeholder - would need to be replaced with actual logo)
  // doc.addImage(logoBase64, 'PNG', 10, 10, 40, 20);
  
  // Document title
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text(`OFFRE N° OFF-${offer.id.slice(0, 8)}`, 105, 30, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${formatDate(offer.created_at)}`, 195, 30, { align: 'right' });
  
  // Client information section
  doc.setFontSize(12);
  doc.setTextColor(44, 62, 80);
  doc.text('CLIENT', 14, 50);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Nom: ${offer.client_name}`, 14, 58);
  doc.text(`Email: ${offer.client_email || 'Non renseigné'}`, 14, 65);
  
  if (offer.clients && offer.clients.company) {
    doc.text(`Société: ${offer.clients.company}`, 14, 72);
  }
  
  // Offer details section
  doc.setFontSize(12);
  doc.setTextColor(44, 62, 80);
  doc.text('DÉTAILS DE L\'OFFRE', 14, 90);
  
  // Basic offer information
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Montant total: ${formatCurrency(offer.amount || 0)}`, 14, 98);
  doc.text(`Paiement mensuel: ${formatCurrency(offer.monthly_payment || 0)}`, 14, 105);
  doc.text(`Coefficient: ${offer.coefficient || 0}`, 14, 112);
  
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
  
  // Add equipment table
  if (equipmentItems && equipmentItems.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
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
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      },
    });
  }
  
  // Add summary at the bottom
  const finalY = (doc as any).lastAutoTable.finalY + 20 || 200;
  
  doc.setFontSize(11);
  doc.setTextColor(44, 62, 80);
  doc.text(`Montant total: ${formatCurrency(offer.amount || 0)}`, 150, finalY);
  doc.text(`Mensualité: ${formatCurrency(offer.monthly_payment || 0)}`, 150, finalY + 7);
  
  // Add terms and conditions
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Cette offre est valable 30 jours à compter de sa date d\'émission. ' +
    'Cette offre est soumise à l\'acceptation finale du bailleur.',
    14, 270
  );
  
  // Add footer with company info
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('iTakeCare SAS - 123 Avenue de la République - 75011 Paris', 105, 280, { align: 'center' });
  doc.text('SIRET: 123 456 789 00011 - contact@itakecare.fr - www.itakecare.fr', 105, 285, { align: 'center' });
  
  // Save the PDF with a proper filename
  const filename = `Offre_${offer.id.slice(0, 8)}_${offer.client_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  
  return filename;
};
