import * as XLSX from 'xlsx';
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
    case 'rejected': return 'Rejetée';
    case 'invoiced': return 'Facturée';
    default: return status || '-';
  }
};

const formatEquipmentForExcel = (offer: any): string => {
  // Try to get equipment from offer_equipment_view or equipment_data
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

const calculateFinancedAmountForExcel = (offer: any): number => {
  // Si c'est un achat, pas de montant financé
  if (offer.is_purchase === true) {
    return 0;
  }
  
  // Si on a une mensualité et un coefficient, calculer le montant financé
  if (offer.monthly_payment && offer.coefficient) {
    return (offer.monthly_payment * 100) / offer.coefficient;
  }
  
  // Sinon utiliser la valeur en base
  return offer.financed_amount || 0;
};

const calculateMarginAmountForExcel = (offer: any): number => {
  const financedAmount = calculateFinancedAmountForExcel(offer);
  const purchasePrice = offer.total_purchase_price || 0;
  return financedAmount - purchasePrice;
};

const applyCurrencyFormat = (worksheet: XLSX.WorkSheet, columnIndices: number[]) => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const currencyFormat = '#,##0.00 €';
  
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (const col of columnIndices) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (cell && typeof cell.v === 'number') {
        cell.z = currencyFormat;
        cell.t = 'n';
      }
    }
  }
};

export const exportOffersToExcel = (offers: any[], filename = 'demandes') => {
  const excelData = offers.map(offer => ({
    'N° Dossier': offer.dossier_number || '-',
    'Date': offer.created_at ? format(new Date(offer.created_at), 'dd/MM/yyyy', { locale: fr }) : '-',
    'Client': offer.client_name?.split(' - ')[0] || '-',
    'Entreprise': offer.clients?.company || '-',
    'Type': getTypeLabel(offer.type),
    'Équipement': formatEquipmentForExcel(offer),
    'Source': offer.source || '-',
    'Bailleur': offer.leaser_name || '-',
    'Montant achat (€)': offer.total_purchase_price || 0,
    'Montant financé (€)': calculateFinancedAmountForExcel(offer),
    'Marge (%)': offer.margin_percentage ? Number(offer.margin_percentage).toFixed(2) : '0',
    'Marge (€)': calculateMarginAmountForExcel(offer),
    'Mensualité (€)': offer.monthly_payment || 0,
    'Statut': getStatusLabel(offer.workflow_status),
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Appliquer le format devise aux colonnes de montants (indices 8, 9, 11, 12)
  applyCurrencyFormat(worksheet, [8, 9, 11, 12]);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // N° Dossier
    { wch: 12 }, // Date
    { wch: 20 }, // Client
    { wch: 20 }, // Entreprise
    { wch: 18 }, // Type
    { wch: 40 }, // Équipement
    { wch: 12 }, // Source
    { wch: 15 }, // Bailleur
    { wch: 15 }, // Montant achat
    { wch: 15 }, // Montant financé
    { wch: 10 }, // Marge %
    { wch: 12 }, // Marge €
    { wch: 12 }, // Mensualité
    { wch: 15 }, // Statut
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
};
