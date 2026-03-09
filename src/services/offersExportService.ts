import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  getEffectiveFinancedAmount, 
  calculateEquipmentTotals, 
  calculateOfferMargin, 
  calculateOfferMarginAmount 
} from '@/utils/marginCalculations';

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

export const exportOffersToExcel = async (offers: any[], filename = 'demandes') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'iTakecare';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Demandes');

  worksheet.columns = [
    { header: 'N° Dossier', key: 'dossier_number', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'Entreprise', key: 'entreprise', width: 20 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Équipement', key: 'equipment', width: 40 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Bailleur', key: 'bailleur', width: 15 },
    { header: 'Réf. leaseur', key: 'leaser_request_number', width: 18 },
    { header: 'Montant achat (€)', key: 'montant_achat', width: 15 },
    { header: 'CA potentiel (€)', key: 'ca_potentiel', width: 15 },
    { header: 'Marge potentielle (%)', key: 'marge_percent', width: 18 },
    { header: 'Marge potentielle (€)', key: 'marge_euros', width: 18 },
    { header: 'Mensualité (€)', key: 'mensualite', width: 12 },
    { header: 'Statut', key: 'statut', width: 15 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  offers.forEach(offer => {
    // Utiliser exactement la même logique que OffersTable (lignes 228-260)
    const equipmentItems = offer.offer_equipment;
    
    const baseFinancedAmount = getEffectiveFinancedAmount(offer, equipmentItems);
    const downPayment = offer.down_payment || 0;
    const effectiveFinancedAmount = downPayment > 0 ? baseFinancedAmount - downPayment : baseFinancedAmount;
    const coefficient = offer.coefficient || 0;

    // Recalculer la mensualité si acompte présent
    const adjustedMonthlyPayment = downPayment > 0 && coefficient > 0
      ? (effectiveFinancedAmount * coefficient) / 100
      : offer.monthly_payment || 0;

    const totalsData = calculateEquipmentTotals(offer, equipmentItems);
    const totalPurchasePrice = totalsData.totalPurchasePrice || offer.total_purchase_price || 0;

    const marginInEuros = calculateOfferMarginAmount(offer, equipmentItems) || 0;
    const marginPercent = calculateOfferMargin(offer, equipmentItems) || 0;

    const row = worksheet.addRow({
      dossier_number: offer.dossier_number || '-',
      date: offer.created_at ? format(new Date(offer.created_at), 'dd/MM/yyyy', { locale: fr }) : '-',
      client: offer.client_name?.split(' - ')[0] || '-',
      entreprise: offer.clients?.company || '-',
      type: getTypeLabel(offer.type),
      equipment: formatEquipmentForExcel(offer),
      source: offer.source || '-',
      bailleur: offer.leaser_name || '-',
      leaser_request_number: offer.leaser_request_number || '-',
      montant_achat: totalPurchasePrice,
      ca_potentiel: effectiveFinancedAmount,
      marge_percent: marginPercent.toFixed(2),
      marge_euros: marginInEuros,
      mensualite: adjustedMonthlyPayment,
      statut: getStatusLabel(offer.workflow_status),
    });

    const currencyColumns = [10, 11, 13, 14];
    currencyColumns.forEach(colIndex => {
      const cell = row.getCell(colIndex);
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00 €';
      }
    });
  });

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
