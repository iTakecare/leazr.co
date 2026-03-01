import ExcelJS from 'exceljs';
import { supabase } from "@/integrations/supabase/client";
import { STOCK_STATUS_CONFIG, CONDITION_CONFIG, StockStatus, StockCondition } from "./stockService";

export async function exportStockToExcel(companyId: string): Promise<void> {
  // Fetch all stock items with joins
  const { data, error } = await supabase
    .from('stock_items' as any)
    .select(`
      *,
      supplier:suppliers(name),
      product:products(name),
      contract:contracts(contract_number, client_name)
    `)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  const items = (data || []) as any[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock');

  // Define columns
  sheet.columns = [
    { header: 'Titre / Description', key: 'title', width: 35 },
    { header: 'N° de série', key: 'serial_number', width: 20 },
    { header: 'Catégorie', key: 'category', width: 18 },
    { header: 'Marque', key: 'brand', width: 15 },
    { header: 'Modèle', key: 'model', width: 18 },
    { header: 'Statut', key: 'status', width: 14 },
    { header: 'État', key: 'condition', width: 14 },
    { header: 'Quantité', key: 'quantity', width: 10 },
    { header: 'Prix unitaire (€)', key: 'unit_price', width: 16 },
    { header: 'Prix total (€)', key: 'purchase_price', width: 16 },
    { header: 'Fournisseur', key: 'supplier_name', width: 20 },
    { header: 'Emplacement', key: 'location', width: 18 },
    { header: 'Réf. commande', key: 'order_reference', width: 18 },
    { header: 'Date d\'achat', key: 'purchase_date', width: 14 },
    { header: 'Date de réception', key: 'reception_date', width: 14 },
    { header: 'Fin de garantie', key: 'warranty_end_date', width: 14 },
    { header: 'Contrat', key: 'contract_info', width: 20 },
    { header: 'CPU', key: 'cpu', width: 22 },
    { header: 'Mémoire', key: 'memory', width: 12 },
    { header: 'Stockage', key: 'storage', width: 14 },
    { header: 'Couleur', key: 'color', width: 12 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A5568' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  for (const item of items) {
    const statusLabel = STOCK_STATUS_CONFIG[item.status as StockStatus]?.label || item.status || '';
    const conditionLabel = CONDITION_CONFIG[item.condition as StockCondition]?.label || item.condition || '';
    const contractInfo = item.contract
      ? `${item.contract.contract_number || ''} - ${item.contract.client_name || ''}`
      : '';

    sheet.addRow({
      title: item.title || '',
      serial_number: item.serial_number || '',
      category: item.category || '',
      brand: item.brand || '',
      model: item.model || '',
      status: statusLabel,
      condition: conditionLabel,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price ?? 0,
      purchase_price: item.purchase_price ?? 0,
      supplier_name: item.supplier?.name || '',
      location: item.location || '',
      order_reference: item.order_reference || '',
      purchase_date: item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('fr-FR') : '',
      reception_date: item.reception_date ? new Date(item.reception_date).toLocaleDateString('fr-FR') : '',
      warranty_end_date: item.warranty_end_date ? new Date(item.warranty_end_date).toLocaleDateString('fr-FR') : '',
      contract_info: contractInfo,
      cpu: item.cpu || '',
      memory: item.memory || '',
      storage: item.storage || '',
      color: item.color || '',
      grade: item.grade || '',
      notes: item.notes || '',
    });
  }

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: items.length + 1, column: sheet.columns.length },
  };

  // Generate & download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
