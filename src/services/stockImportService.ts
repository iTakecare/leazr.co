import ExcelJS from 'exceljs';
import { supabase } from "@/integrations/supabase/client";
import { StockStatus, StockCondition, STOCK_STATUS_CONFIG, CONDITION_CONFIG } from "./stockService";

export interface StockImportRow {
  title: string;
  serial_number?: string;
  category?: string;
  brand?: string;
  model?: string;
  supplier_name?: string;
  quantity?: number;
  unit_price?: number;
  purchase_price?: number;
  status?: string;
  condition?: string;
  location?: string;
  purchase_date?: string;
  reception_date?: string;
  warranty_end_date?: string;
  order_reference?: string;
  notes?: string;
  cpu?: string;
  memory?: string;
  storage?: string;
  color?: string;
  grade?: string;
}

export interface StockImportResult {
  success: number;
  errors: Array<{ row: number; error: string }>;
  duplicates: number;
}

export interface StockColumnMapping {
  excelHeader: string;
  field: keyof StockImportRow | null;
}

const FIELD_LABELS: Record<keyof StockImportRow, string> = {
  title: 'Titre / Description',
  serial_number: 'N° de série',
  category: 'Catégorie',
  brand: 'Marque',
  model: 'Modèle',
  supplier_name: 'Fournisseur',
  quantity: 'Quantité',
  unit_price: 'Prix unitaire',
  purchase_price: 'Prix total',
  status: 'Statut',
  condition: 'État',
  location: 'Emplacement',
  purchase_date: 'Date d\'achat',
  reception_date: 'Date de réception',
  warranty_end_date: 'Fin de garantie',
  order_reference: 'Réf. commande',
  notes: 'Notes',
  cpu: 'CPU / Processeur',
  memory: 'Mémoire / RAM',
  storage: 'Stockage / Disque',
  color: 'Couleur',
  grade: 'Grade',
};

export const getFieldLabel = (field: keyof StockImportRow) => FIELD_LABELS[field] || field;

export const STOCK_IMPORT_FIELDS = Object.keys(FIELD_LABELS) as (keyof StockImportRow)[];

// Normalize header for matching
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Column auto-detection mappings
const HEADER_PATTERNS: Record<keyof StockImportRow, string[]> = {
  title: ['titre', 'description', 'nom', 'designation', 'article', 'libelle', 'name', 'title'],
  serial_number: ['serie', 'serial', 'nserie', 'numeroserie', 'serialnumber', 'sn', 'imei'],
  category: ['categorie', 'category', 'type', 'famille', 'gamme'],
  brand: ['marque', 'brand', 'fabricant', 'constructeur', 'manufacturer'],
  model: ['modele', 'model', 'reference', 'ref'],
  supplier_name: ['fournisseur', 'supplier', 'vendeur', 'revendeur'],
  quantity: ['quantite', 'qty', 'qte', 'nombre', 'nb', 'quantity', 'nbre'],
  unit_price: ['prixunitaire', 'unitprice', 'pu', 'prixunit', 'coutunitaire', 'unitcost'],
  purchase_price: ['prixachat', 'prix', 'price', 'cout', 'cost', 'montant', 'purchaseprice', 'prixht', 'prixtotal', 'total'],
  status: ['statut', 'status', 'etat', 'state'],
  condition: ['condition', 'etatphysique', 'etatmateriel', 'qualite'],
  location: ['emplacement', 'location', 'lieu', 'site', 'entrepot', 'depot', 'bureau'],
  purchase_date: ['dateachat', 'datecommande', 'purchasedate', 'dateorder'],
  reception_date: ['datereception', 'datelivraison', 'receptiondate', 'deliverydate'],
  warranty_end_date: ['garantie', 'warranty', 'fingarantie', 'warrantyend', 'dategarantie', 'findegarantie'],
  order_reference: ['refcommande', 'referencecommande', 'orderreference', 'numcommande', 'numerocommande', 'boncommande'],
  notes: ['notes', 'remarques', 'commentaire', 'observation', 'commentaires', 'remarque'],
  cpu: ['cpu', 'processeur', 'processor', 'proc'],
  memory: ['memoire', 'ram', 'memory', 'mem'],
  storage: ['stockage', 'disque', 'disk', 'ssd', 'hdd', 'storage', 'capacite'],
  color: ['couleur', 'color', 'colour'],
  grade: ['grade', 'classement', 'qualitegrade', 'etatgrade'],
};

// Status mapping from French labels to enum values
const STATUS_FR_MAP: Record<string, StockStatus> = {
  'commande': 'ordered',
  'en stock': 'in_stock',
  'enstock': 'in_stock',
  'stock': 'in_stock',
  'disponible': 'in_stock',
  'attribue': 'assigned',
  'assigne': 'assigned',
  'en reparation': 'in_repair',
  'reparation': 'in_repair',
  'vendu': 'sold',
  'rebut': 'scrapped',
  'hors service': 'scrapped',
  'defectueux': 'scrapped',
  // English
  'ordered': 'ordered',
  'in_stock': 'in_stock',
  'in stock': 'in_stock',
  'assigned': 'assigned',
  'in_repair': 'in_repair',
  'sold': 'sold',
  'scrapped': 'scrapped',
};

const CONDITION_FR_MAP: Record<string, StockCondition> = {
  'neuf': 'new',
  'new': 'new',
  'comme neuf': 'like_new',
  'like new': 'like_new',
  'bon': 'good',
  'bon etat': 'good',
  'good': 'good',
  'moyen': 'fair',
  'etat moyen': 'fair',
  'fair': 'fair',
  'defectueux': 'defective',
  'defective': 'defective',
  'hs': 'defective',
};

function detectColumnMapping(headers: string[]): StockColumnMapping[] {
  const mappings: StockColumnMapping[] = [];
  const usedFields = new Set<keyof StockImportRow>();

  for (const header of headers) {
    const normalized = normalize(header);
    let matchedField: keyof StockImportRow | null = null;

    for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
      if (usedFields.has(field as keyof StockImportRow)) continue;
      for (const pattern of patterns) {
        if (normalized.includes(pattern) || pattern.includes(normalized)) {
          matchedField = field as keyof StockImportRow;
          usedFields.add(matchedField);
          break;
        }
      }
      if (matchedField) break;
    }

    mappings.push({ excelHeader: header, field: matchedField });
  }

  return mappings;
}

function parseDate(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  if (!str) return undefined;

  // Try DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return undefined;
}

function parseNumeric(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const str = String(value).replace(/[€$£¥\s]/g, '').replace(',', '.');
  return parseFloat(str) || 0;
}

function mapStatus(value: any): StockStatus {
  if (!value) return 'in_stock';
  const key = normalize(String(value));
  for (const [pattern, status] of Object.entries(STATUS_FR_MAP)) {
    if (normalize(pattern) === key || key.includes(normalize(pattern))) {
      return status;
    }
  }
  return 'in_stock';
}

function mapCondition(value: any): StockCondition {
  if (!value) return 'good';
  const key = normalize(String(value));
  for (const [pattern, condition] of Object.entries(CONDITION_FR_MAP)) {
    if (normalize(pattern) === key || key.includes(normalize(pattern))) {
      return condition;
    }
  }
  return 'good';
}

export async function parseStockExcel(file: File): Promise<{
  headers: string[];
  mappings: StockColumnMapping[];
  rows: any[][];
  totalRows: number;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Aucune feuille trouvée dans le fichier');

  const headers: string[] = [];
  const firstRow = worksheet.getRow(1);
  firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    while (headers.length < colNumber - 1) headers.push(`Colonne ${headers.length + 1}`);
    headers.push(String(cell.value || `Colonne ${colNumber}`));
  });

  const rows: any[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const values: any[] = [];
    for (let i = 1; i <= headers.length; i++) {
      const cell = row.getCell(i);
      values.push(cell.value);
    }
    // Skip fully empty rows
    if (values.some(v => v !== null && v !== undefined && String(v).trim() !== '')) {
      rows.push(values);
    }
  });

  const mappings = detectColumnMapping(headers);

  return { headers, mappings, rows, totalRows: rows.length };
}

export async function importStockItems(
  rows: any[][],
  mappings: StockColumnMapping[],
  companyId: string,
  userId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<StockImportResult> {
  const result: StockImportResult = { success: 0, errors: [], duplicates: 0 };

  // Build a lookup for supplier names -> IDs
  const { data: existingSuppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('company_id', companyId);
  const supplierMap = new Map<string, string>();
  (existingSuppliers || []).forEach((s: any) => supplierMap.set(normalize(s.name), s.id));

  // Build lookups for categories and brands from catalogue
  const { data: catalogCategories } = await supabase
    .from('categories')
    .select('name, translation')
    .eq('company_id', companyId);
  const categoryNameMap = new Map<string, string>();
  (catalogCategories || []).forEach((c: any) => {
    categoryNameMap.set(normalize(c.name), c.name);
    if (c.translation) categoryNameMap.set(normalize(c.translation), c.name);
  });

  const { data: catalogBrands } = await supabase
    .from('brands')
    .select('name')
    .eq('company_id', companyId);
  const brandNameMap = new Map<string, string>();
  (catalogBrands || []).forEach((b: any) => {
    brandNameMap.set(normalize(b.name), b.name);
  });

  // Extract brand from title by matching against catalogue brand names
  function extractBrandFromTitle(title: string, brandNames: string[]): string | null {
    const normalizedTitle = normalize(title);
    for (const brand of brandNames) {
      if (normalizedTitle.includes(normalize(brand))) {
        return brand;
      }
    }
    return null;
  }

  // Check existing serial numbers for duplicate detection
  const { data: existingItems } = await supabase
    .from('stock_items' as any)
    .select('serial_number')
    .eq('company_id', companyId)
    .not('serial_number', 'is', null);
  const existingSerials = new Set<string>(
    (existingItems || []).map((i: any) => normalize(String(i.serial_number || '')))
  );

  for (let i = 0; i < rows.length; i++) {
    try {
      onProgress?.(i + 1, rows.length);
      const row = rows[i];

      // Build import row from mappings
      const parsed: Record<string, any> = {};
      mappings.forEach((m, colIdx) => {
        if (m.field && colIdx < row.length) {
          parsed[m.field] = row[colIdx];
        }
      });

      // Title is required
      const title = String(parsed.title || '').trim();
      if (!title) {
        result.errors.push({ row: i + 2, error: 'Titre manquant' });
        continue;
      }

      // Check duplicate serial
      const serialNumber = String(parsed.serial_number || '').trim() || null;
      if (serialNumber && existingSerials.has(normalize(serialNumber))) {
        result.duplicates++;
        continue;
      }

      // Resolve supplier
      let supplierId: string | null = null;
      const supplierName = String(parsed.supplier_name || '').trim();
      if (supplierName) {
        const normalizedSupplier = normalize(supplierName);
        if (supplierMap.has(normalizedSupplier)) {
          supplierId = supplierMap.get(normalizedSupplier)!;
        } else {
          // Create supplier
          const { data: newSupplier } = await supabase
            .from('suppliers')
            .insert({ company_id: companyId, name: supplierName } as any)
            .select('id')
            .single();
          if (newSupplier) {
            supplierId = (newSupplier as any).id;
            supplierMap.set(normalizedSupplier, supplierId!);
          }
        }
      }

      const status = mapStatus(parsed.status);
      const condition = mapCondition(parsed.condition);

      const qty = Math.max(1, Math.round(parseNumeric(parsed.quantity)) || 1);
      const unitPrice = parseNumeric(parsed.unit_price);
      const totalPrice = parseNumeric(parsed.purchase_price);
      // If unit_price provided, use it; otherwise derive from total/qty
      const finalUnitPrice = unitPrice > 0 ? unitPrice : (totalPrice > 0 && qty > 0 ? totalPrice / qty : 0);
      const finalTotal = unitPrice > 0 ? qty * unitPrice : (totalPrice > 0 ? totalPrice : qty * finalUnitPrice);

        const rawCategory = String(parsed.category || '').trim();
        const matchedCategory = rawCategory ? (categoryNameMap.get(normalize(rawCategory)) || rawCategory) : null;
        const rawBrand = String(parsed.brand || '').trim();
        const matchedBrand = rawBrand ? (brandNameMap.get(normalize(rawBrand)) || rawBrand) : null;
        const finalBrand = matchedBrand || extractBrandFromTitle(title, Array.from(brandNameMap.values()));

      const itemData: any = {
        company_id: companyId,
        title,
        serial_number: serialNumber,
        serial_numbers: serialNumber ? [serialNumber] : [],
        category: matchedCategory,
        brand: finalBrand,
        model: String(parsed.model || '').trim() || null,
        supplier_id: supplierId,
        quantity: qty,
        unit_price: finalUnitPrice,
        purchase_price: finalTotal,
        status,
        condition,
        location: String(parsed.location || '').trim() || null,
        purchase_date: parseDate(parsed.purchase_date) || null,
        reception_date: parseDate(parsed.reception_date) || null,
        warranty_end_date: parseDate(parsed.warranty_end_date) || null,
        order_reference: String(parsed.order_reference || '').trim() || null,
        notes: String(parsed.notes || '').trim() || null,
        cpu: String(parsed.cpu || '').trim() || null,
        memory: String(parsed.memory || '').trim() || null,
        storage: String(parsed.storage || '').trim() || null,
        color: String(parsed.color || '').trim() || null,
        grade: String(parsed.grade || '').trim() || null,
      };

      const { data: created, error } = await supabase
        .from('stock_items' as any)
        .insert(itemData)
        .select('id')
        .single();

      if (error) {
        result.errors.push({ row: i + 2, error: error.message });
        continue;
      }

      // Create reception movement
      if (created) {
        await supabase
          .from('stock_movements' as any)
          .insert({
            company_id: companyId,
            stock_item_id: (created as any).id,
            movement_type: 'reception',
            from_status: null,
            to_status: status,
            performed_by: userId,
            notes: 'Import Excel',
          } as any);
      }

      if (serialNumber) {
        existingSerials.add(normalize(serialNumber));
      }
      result.success++;
    } catch (err: any) {
      result.errors.push({ row: i + 2, error: err.message || 'Erreur inconnue' });
    }
  }

  return result;
}
