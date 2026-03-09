import ExcelJS from 'exceljs';
import { EquipmentOrderItem, ORDER_STATUS_CONFIG, OrderStatus } from './equipmentOrderService';

interface SupplierInfo {
  id: string;
  name: string;
  supplier_type?: string;
}

export async function exportEquipmentOrdersToExcel(
  items: EquipmentOrderItem[],
  suppliers: SupplierInfo[]
): Promise<void> {
  const supplierMap = new Map(suppliers.map(s => [s.id, s]));

  const getSupplierName = (id: string | null) => (id ? supplierMap.get(id)?.name || '' : '');
  const getSupplierType = (id: string | null) => (id ? supplierMap.get(id)?.supplier_type || 'belgian' : 'belgian');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Commandes fournisseurs');

  sheet.columns = [
    { header: 'Source', key: 'source', width: 12 },
    { header: 'N° Contrat', key: 'source_reference', width: 18 },
    { header: 'Client', key: 'client_name', width: 22 },
    { header: 'Équipement', key: 'title', width: 30 },
    { header: 'Quantité', key: 'quantity', width: 10 },
    { header: 'Fournisseur', key: 'supplier_name', width: 22 },
    { header: 'Prix HTVA unit.', key: 'unit_price_ht', width: 16 },
    { header: 'Prix HTVA total', key: 'total_price_ht', width: 16 },
    { header: 'TVA', key: 'tva', width: 14 },
    { header: 'Prix TVAC', key: 'price_tvac', width: 16 },
    { header: 'Statut', key: 'status', width: 14 },
    { header: 'Réf. commande', key: 'order_reference', width: 18 },
    { header: 'Date commande', key: 'order_date', width: 14 },
    { header: 'Date réception', key: 'reception_date', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A5568' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  for (const item of items) {
    const unitPriceHT = item.supplier_price || item.purchase_price || 0;
    const totalHT = unitPriceHT * item.quantity;
    const supplierType = getSupplierType(item.supplier_id);
    const tvaAmount = supplierType === 'belgian' ? totalHT * 0.21 : 0;
    const statusLabel = ORDER_STATUS_CONFIG[item.order_status as OrderStatus]?.label || item.order_status || '';

    sheet.addRow({
      source: item.source_type === 'offer' ? 'Offre' : 'Contrat',
      source_reference: item.source_reference || '',
      client_name: item.client_name || '',
      title: item.title || '',
      quantity: item.quantity,
      supplier_name: getSupplierName(item.supplier_id),
      unit_price_ht: unitPriceHT,
      total_price_ht: totalHT,
      tva: tvaAmount,
      price_tvac: totalHT + tvaAmount,
      status: statusLabel,
      order_reference: item.order_reference || '',
      order_date: item.order_date ? new Date(item.order_date).toLocaleDateString('fr-FR') : '',
      reception_date: item.reception_date ? new Date(item.reception_date).toLocaleDateString('fr-FR') : '',
      notes: item.order_notes || '',
    });
  }

  // Format currency columns
  [7, 8, 9, 10].forEach(col => {
    sheet.getColumn(col).numFmt = '#,##0.00 €';
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: items.length + 1, column: sheet.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes_fournisseurs_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
