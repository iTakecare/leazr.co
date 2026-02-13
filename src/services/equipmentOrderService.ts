import { supabase } from "@/integrations/supabase/client";
import { EquipmentOrderUnit } from "@/types/offerEquipment";

export type OrderStatus = 'to_order' | 'ordered' | 'received' | 'cancelled';

export interface EquipmentOrderUpdate {
  order_status?: OrderStatus;
  supplier_id?: string | null;
  supplier_price?: number | null;
  order_date?: string | null;
  order_reference?: string | null;
  reception_date?: string | null;
  order_notes?: string | null;
}

export interface EquipmentOrderItem {
  id: string;
  title: string;
  quantity: number;
  purchase_price: number;
  order_status: OrderStatus;
  supplier_id: string | null;
  supplier_price: number | null;
  order_date: string | null;
  order_reference: string | null;
  reception_date: string | null;
  order_notes: string | null;
  product_id?: string | null;
  source_type?: 'offer' | 'contract';
  source_id?: string;
  client_name?: string;
  source_reference?: string;
  source_date?: string;
  units?: EquipmentOrderUnit[];
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  to_order: { label: 'À commander', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
  ordered: { label: 'Commandé', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-200' },
  received: { label: 'Reçu', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
  cancelled: { label: 'Annulé', color: 'text-gray-500', bgColor: 'bg-gray-100 border-gray-200' },
};

export const updateOfferEquipmentOrder = async (equipmentId: string, data: EquipmentOrderUpdate) => {
  const { error } = await supabase
    .from('offer_equipment')
    .update(data as any)
    .eq('id', equipmentId);
  if (error) throw error;
};

export const updateContractEquipmentOrder = async (equipmentId: string, data: EquipmentOrderUpdate) => {
  // Auto-sync supplier_price ↔ actual_purchase_price for contracts
  const syncedData: Record<string, any> = { ...data };
  if (data.supplier_price !== undefined) {
    syncedData.actual_purchase_price = data.supplier_price;
  }
  const { error } = await supabase
    .from('contract_equipment')
    .update(syncedData)
    .eq('id', equipmentId);
  if (error) throw error;
};

export const fetchSuppliers = async (companyId: string) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, supplier_type')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
};

export const fetchPreferredSupplier = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_supplier_prices')
    .select('supplier_id, unit_price')
    .eq('product_id', productId)
    .eq('is_preferred', true)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// ===== Equipment Order Units CRUD =====

export const splitEquipmentIntoUnits = async (
  sourceType: 'offer' | 'contract',
  equipmentId: string,
  quantity: number,
  defaultSupplierId?: string | null,
  defaultSupplierPrice?: number | null
) => {
  const units = Array.from({ length: quantity }, (_, i) => ({
    source_type: sourceType,
    source_equipment_id: equipmentId,
    unit_index: i + 1,
    order_status: 'to_order',
    supplier_id: defaultSupplierId || null,
    supplier_price: defaultSupplierPrice || null,
  }));

  const { data, error } = await supabase
    .from('equipment_order_units' as any)
    .insert(units)
    .select();
  if (error) throw error;
  return data;
};

export const fetchEquipmentUnits = async (
  sourceType: 'offer' | 'contract',
  equipmentId: string
): Promise<EquipmentOrderUnit[]> => {
  const { data, error } = await supabase
    .from('equipment_order_units' as any)
    .select('*')
    .eq('source_type', sourceType)
    .eq('source_equipment_id', equipmentId)
    .order('unit_index');
  if (error) throw error;
  return (data || []) as EquipmentOrderUnit[];
};

export const updateEquipmentUnit = async (unitId: string, data: Partial<EquipmentOrderUnit>) => {
  const { error } = await supabase
    .from('equipment_order_units' as any)
    .update(data as any)
    .eq('id', unitId);
  if (error) throw error;
};

// Sync prices from units back to the parent equipment row
export const syncUnitPricesToParent = async (
  sourceType: 'offer' | 'contract',
  equipmentId: string
) => {
  const units = await fetchEquipmentUnits(sourceType, equipmentId);
  if (units.length === 0) return;

  // Calculate average supplier_price across units (only non-null)
  const pricesWithValues = units.filter(u => u.supplier_price != null);
  if (pricesWithValues.length === 0) return;

  const avgPrice = pricesWithValues.reduce((s, u) => s + (u.supplier_price || 0), 0) / pricesWithValues.length;

  const table = sourceType === 'offer' ? 'offer_equipment' : 'contract_equipment';
  const updateData: Record<string, any> = { supplier_price: avgPrice };
  if (sourceType === 'contract') {
    updateData.actual_purchase_price = avgPrice;
  }

  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', equipmentId);
  if (error) throw error;
};

export const fetchAllEquipmentOrders = async (companyId: string) => {
  const { data: offerEquipment, error: offerError } = await supabase
    .from('offer_equipment')
    .select(`
      id, title, quantity, purchase_price, product_id,
      order_status, supplier_id, supplier_price, order_date, order_reference, reception_date, order_notes,
      offers!inner(id, dossier_number, client_name, company_id, created_at)
    `)
    .eq('offers.company_id', companyId)
    .eq('offers.workflow_status', 'accepted');

  if (offerError) throw offerError;

  const { data: contractEquipment, error: contractError } = await supabase
    .from('contract_equipment')
    .select(`
      id, title, quantity, purchase_price, actual_purchase_price,
      order_status, supplier_id, supplier_price, order_date, order_reference, reception_date, order_notes,
      contracts!inner(id, contract_number, client_name, company_id, created_at)
    `)
    .eq('contracts.company_id', companyId);

  if (contractError) throw contractError;

  // Fetch all units at once
  const { data: allUnits, error: unitsError } = await supabase
    .from('equipment_order_units' as any)
    .select('*')
    .order('unit_index');

  if (unitsError) throw unitsError;

  const unitsByKey = new Map<string, EquipmentOrderUnit[]>();
  ((allUnits || []) as EquipmentOrderUnit[]).forEach(u => {
    const key = `${u.source_type}-${u.source_equipment_id}`;
    if (!unitsByKey.has(key)) unitsByKey.set(key, []);
    unitsByKey.get(key)!.push(u);
  });

  const items: EquipmentOrderItem[] = [
    ...(offerEquipment || []).map((eq: any) => ({
      id: eq.id,
      title: eq.title,
      quantity: eq.quantity,
      purchase_price: eq.purchase_price,
      order_status: (eq.order_status || 'to_order') as OrderStatus,
      supplier_id: eq.supplier_id,
      supplier_price: eq.supplier_price,
      order_date: eq.order_date,
      order_reference: eq.order_reference,
      reception_date: eq.reception_date,
      order_notes: eq.order_notes,
      product_id: eq.product_id,
      source_type: 'offer' as const,
      source_id: eq.offers?.id,
      client_name: eq.offers?.client_name,
      source_reference: eq.offers?.dossier_number || 'N/A',
      source_date: eq.offers?.created_at,
      units: unitsByKey.get(`offer-${eq.id}`) || undefined,
    })),
    ...(contractEquipment || []).map((eq: any) => ({
      id: eq.id,
      title: eq.title,
      quantity: eq.quantity,
      purchase_price: eq.purchase_price,
      order_status: (eq.order_status || 'to_order') as OrderStatus,
      supplier_id: eq.supplier_id,
      supplier_price: eq.supplier_price ?? eq.actual_purchase_price ?? null,
      order_date: eq.order_date,
      order_reference: eq.order_reference,
      reception_date: eq.reception_date,
      order_notes: eq.order_notes,
      product_id: null,
      source_type: 'contract' as const,
      source_id: eq.contracts?.id,
      client_name: eq.contracts?.client_name,
      source_reference: eq.contracts?.contract_number || 'N/A',
      source_date: eq.contracts?.created_at,
      units: unitsByKey.get(`contract-${eq.id}`) || undefined,
    })),
  ];

  return items;
};
