import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { Product } from '@/types/catalog';

/**
 * Export Excel du catalogue, axé sur la transmission aux fournisseurs :
 * met en avant le SKU client (sku_itc) à côté du SKU d'origine et des
 * caractéristiques produit.
 */
export const exportCatalogToExcel = async (
  products: Product[],
  filename = 'catalogue'
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'iTakecare';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Catalogue');

  worksheet.columns = [
    { header: 'SKU client', key: 'sku_itc', width: 20 },
    { header: 'Marque', key: 'brand', width: 18 },
    { header: 'Modèle', key: 'model', width: 20 },
    { header: 'Nom', key: 'name', width: 36 },
    { header: 'Catégorie', key: 'category', width: 18 },
    { header: 'SKU origine', key: 'sku', width: 18 },
    { header: "Prix d'achat (€)", key: 'price', width: 16 },
    { header: 'Mensualité (€)', key: 'monthly_price', width: 16 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A5568' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  products.forEach((product) => {
    worksheet.addRow({
      sku_itc: product.sku_itc || '',
      brand: product.brand || '',
      model: product.model || '',
      name: product.name || '',
      category: product.category || '',
      sku: product.sku || '',
      price: product.price || 0,
      monthly_price: product.monthly_price || 0,
    });
  });

  [7, 8].forEach((col) => {
    worksheet.getColumn(col).numFmt = '#,##0.00 €';
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: products.length + 1, column: worksheet.columns.length },
  };

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${dateStr}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
