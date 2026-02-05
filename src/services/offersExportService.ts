import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const getTypeLabel = (type: string | undefined): string => {
  switch (type) {
    case 'admin_offer': return 'Offre Admin';
    case 'client_request': return 'Demande Client';
    case 'ambassador_offer': return 'Offre Ambassadeur';
    default: return type || '-';
  }
};

const getStatusLabel = (status: string | undefined): string => {
  switch (status) {
    case 'draft': return 'Brouillon';
    case 'sent': return 'Envoyée';
    case 'info_requested': return 'Info demandée';
    case 'info_received': return 'Info reçue';
    case 'approved': return 'Approuvée';
    case 'leaser_review': return 'En révision bailleur';
    case 'accepted': return 'Acceptée';
    case 'contract_signed': return 'Acceptée';
    case 'rejected': return 'Rejetée';
    case 'invoiced': return 'Facturée';
    default: return status || '-';
  }
};

const formatEquipmentForExcel = (offer: any): string => {
  // Priorité 1: offer_equipment (depuis useFetchOffers)
  if (offer.offer_equipment && Array.isArray(offer.offer_equipment)) {
    return offer.offer_equipment
      .map((eq: any) => `${eq.title || eq.product_name || 'Équipement'} x${eq.quantity || 1}`)
      .join(', ');
  }
  
  if (offer.offer_equipment_view && Array.isArray(offer.offer_equipment_view)) {
    return offer.offer_equipment_view
      .map((eq: any) => `${eq.title || eq.product_name || 'Équipement'} x${eq.quantity || 1}`)
      .join(', ');
  }
  
  if (offer.equipment_data && Array.isArray(offer.equipment_data)) {
    return offer.equipment_data
      .map((eq: any) => `${eq.title || 'Équipement'} x${eq.quantity || 1}`)
      .join(', ');
  }
  
  if (offer.equipment_description) {
    return offer.equipment_description;
  }
  
  return '-';
};

// Calcul du prix d'achat total depuis offer_equipment
const calculatePurchasePriceFromEquipment = (offer: any): number => {
  if (offer.offer_equipment && Array.isArray(offer.offer_equipment)) {
    return offer.offer_equipment.reduce((sum: number, eq: any) => {
      const qty = eq.quantity || 1;
      return sum + ((eq.purchase_price || 0) * qty);
    }, 0);
  }
  
  if (offer.offer_equipment_view && Array.isArray(offer.offer_equipment_view)) {
    return offer.offer_equipment_view.reduce((sum: number, eq: any) => {
      const qty = eq.quantity || 1;
      return sum + ((eq.purchase_price || 0) * qty);
    }, 0);
  }
  
  return offer.total_purchase_price || 0;
};

// Calcul du CA potentiel (prix de vente) depuis offer_equipment
const calculateSellingPriceFromEquipment = (offer: any): number => {
  if (offer.offer_equipment && Array.isArray(offer.offer_equipment)) {
    return offer.offer_equipment.reduce((sum: number, eq: any) => {
      const qty = eq.quantity || 1;
      // margin est un pourcentage
      const sellingPrice = eq.selling_price || 
        ((eq.purchase_price || 0) * (1 + (eq.margin || 0) / 100));
      return sum + (sellingPrice * qty);
    }, 0);
  }
  
  if (offer.offer_equipment_view && Array.isArray(offer.offer_equipment_view)) {
    return offer.offer_equipment_view.reduce((sum: number, eq: any) => {
      const qty = eq.quantity || 1;
      const sellingPrice = eq.selling_price || 
        ((eq.purchase_price || 0) * (1 + (eq.margin || 0) / 100));
      return sum + (sellingPrice * qty);
    }, 0);
  }
  
  return 0;
};

// CA potentiel - aligné avec la logique du dashboard RPC
const calculateFinancedAmountForExcel = (offer: any): number => {
  // Priorité 1: Somme des prix de vente depuis les équipements
  const sellingPriceFromEquipment = calculateSellingPriceFromEquipment(offer);
  if (sellingPriceFromEquipment > 0) {
    return sellingPriceFromEquipment;
  }
  // Fallback: financed_amount ou amount stocké en base
  return offer.financed_amount || offer.amount || 0;
};

// Calcul du pourcentage de marge pour l'export Excel
const calculateMarginPercentageForExcel = (offer: any): number => {
  const financedAmount = calculateFinancedAmountForExcel(offer);
  const purchasePrice = calculatePurchasePriceFromEquipment(offer);
  if (purchasePrice <= 0) return 0;
  return ((financedAmount - purchasePrice) / purchasePrice) * 100;
};

// Marge potentielle = CA potentiel - Prix d'achat
const calculateMarginAmountForExcel = (offer: any): number => {
  const financedAmount = calculateFinancedAmountForExcel(offer);
  const purchasePrice = calculatePurchasePriceFromEquipment(offer);
  return financedAmount - purchasePrice;
};

export const exportOffersToExcel = async (offers: any[], filename = 'demandes') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'iTakecare';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Demandes');

  // Define columns with headers and widths
  worksheet.columns = [
    { header: 'N° Dossier', key: 'dossier_number', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'Entreprise', key: 'entreprise', width: 20 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Équipement', key: 'equipment', width: 40 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Bailleur', key: 'bailleur', width: 15 },
    { header: 'Montant achat (€)', key: 'montant_achat', width: 15 },
    { header: 'CA potentiel (€)', key: 'ca_potentiel', width: 15 },
    { header: 'Marge potentielle (%)', key: 'marge_percent', width: 18 },
    { header: 'Marge potentielle (€)', key: 'marge_euros', width: 18 },
    { header: 'Mensualité (€)', key: 'mensualite', width: 12 },
    { header: 'Statut', key: 'statut', width: 15 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data rows
  offers.forEach(offer => {
    const row = worksheet.addRow({
      dossier_number: offer.dossier_number || '-',
      date: offer.created_at ? format(new Date(offer.created_at), 'dd/MM/yyyy', { locale: fr }) : '-',
      client: offer.client_name?.split(' - ')[0] || '-',
      entreprise: offer.clients?.company || '-',
      type: getTypeLabel(offer.type),
      equipment: formatEquipmentForExcel(offer),
      source: offer.source || '-',
      bailleur: offer.leaser_name || '-',
      montant_achat: calculatePurchasePriceFromEquipment(offer),
      ca_potentiel: calculateFinancedAmountForExcel(offer),
      marge_percent: calculateMarginPercentageForExcel(offer).toFixed(2),
      marge_euros: calculateMarginAmountForExcel(offer),
      mensualite: offer.monthly_payment || 0,
      statut: getStatusLabel(offer.workflow_status),
    });

    // Apply currency format to monetary columns
    const currencyColumns = [9, 10, 12, 13]; // montant_achat, ca_potentiel, marge_euros, mensualite
    currencyColumns.forEach(colIndex => {
      const cell = row.getCell(colIndex);
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00 €';
      }
    });
  });

  // Generate and download file
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const buffer = await workbook.xlsx.writeBuffer();
  
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${dateStr}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
