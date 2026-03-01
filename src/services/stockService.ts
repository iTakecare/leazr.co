import { supabase } from "@/integrations/supabase/client";

export type StockStatus = 'ordered' | 'in_stock' | 'assigned' | 'in_repair' | 'sold' | 'scrapped';
export type StockCondition = 'new' | 'like_new' | 'good' | 'fair' | 'defective';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned';
export type MovementType = 'reception' | 'assign_contract' | 'unassign_contract' | 'swap_out' | 'swap_in' | 'repair_start' | 'repair_end' | 'scrap' | 'sell';

export interface StockItem {
  id: string;
  company_id: string;
  serial_number: string | null;
  product_id: string | null;
  title: string;
  status: StockStatus;
  condition: StockCondition;
  purchase_price: number;
  supplier_id: string | null;
  order_reference: string | null;
  purchase_date: string | null;
  reception_date: string | null;
  current_contract_id: string | null;
  current_contract_equipment_id: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: { name: string } | null;
  product?: { name: string } | null;
  contract?: { contract_number: string; client_name: string } | null;
}

export interface StockMovement {
  id: string;
  company_id: string;
  stock_item_id: string;
  movement_type: MovementType;
  from_status: string | null;
  to_status: string | null;
  contract_id: string | null;
  related_stock_item_id: string | null;
  cost: number | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  stock_item?: { title: string; serial_number: string | null } | null;
}

export interface StockRepair {
  id: string;
  company_id: string;
  stock_item_id: string;
  reason: string;
  description: string | null;
  repair_cost: number;
  supplier_id: string | null;
  status: RepairStatus;
  started_at: string;
  completed_at: string | null;
  result_condition: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  stock_item?: { title: string; serial_number: string | null } | null;
  supplier?: { name: string } | null;
}

export const STOCK_STATUS_CONFIG: Record<StockStatus, { label: string; color: string; bgColor: string }> = {
  ordered: { label: 'Commandé', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
  in_stock: { label: 'En stock', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
  assigned: { label: 'Attribué', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
  in_repair: { label: 'En réparation', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-200' },
  sold: { label: 'Vendu', color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-200' },
  scrapped: { label: 'Rebut', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
};

export const CONDITION_CONFIG: Record<StockCondition, { label: string }> = {
  new: { label: 'Neuf' },
  like_new: { label: 'Comme neuf' },
  good: { label: 'Bon état' },
  fair: { label: 'État moyen' },
  defective: { label: 'Défectueux' },
};

export const REPAIR_STATUS_CONFIG: Record<RepairStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
  in_progress: { label: 'En cours', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
  completed: { label: 'Terminée', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
  abandoned: { label: 'Abandonnée', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
};

// ===== STOCK ITEMS =====

export const fetchStockItems = async (companyId: string, statusFilter?: StockStatus) => {
  let query = supabase
    .from('stock_items' as any)
    .select(`
      *,
      supplier:suppliers(name),
      product:products(name),
      contract:contracts(contract_number, client_name)
    `)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as StockItem[];
};

export const fetchStockItemById = async (itemId: string) => {
  const { data, error } = await supabase
    .from('stock_items' as any)
    .select(`
      *,
      supplier:suppliers(name),
      product:products(name),
      contract:contracts(contract_number, client_name)
    `)
    .eq('id', itemId)
    .single();
  if (error) throw error;
  return data as unknown as StockItem;
};

export const createStockItem = async (item: Partial<StockItem>) => {
  const { data, error } = await supabase
    .from('stock_items' as any)
    .insert(item as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as StockItem;
};

export const updateStockItem = async (itemId: string, updates: Partial<StockItem>) => {
  const { error } = await supabase
    .from('stock_items' as any)
    .update(updates as any)
    .eq('id', itemId);
  if (error) throw error;
};

// ===== STOCK MOVEMENTS =====

export const createMovement = async (movement: Partial<StockMovement>) => {
  const { error } = await supabase
    .from('stock_movements' as any)
    .insert(movement as any);
  if (error) throw error;
};

export const fetchMovements = async (companyId: string, stockItemId?: string) => {
  let query = supabase
    .from('stock_movements' as any)
    .select(`
      *,
      stock_item:stock_items(title, serial_number)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (stockItemId) {
    query = query.eq('stock_item_id', stockItemId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as StockMovement[];
};

// ===== STOCK REPAIRS =====

export const fetchRepairs = async (companyId: string, statusFilter?: RepairStatus) => {
  let query = supabase
    .from('stock_repairs' as any)
    .select(`
      *,
      stock_item:stock_items(title, serial_number),
      supplier:suppliers(name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as StockRepair[];
};

export const createRepair = async (repair: Partial<StockRepair>) => {
  const { data, error } = await supabase
    .from('stock_repairs' as any)
    .insert(repair as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as StockRepair;
};

export const updateRepair = async (repairId: string, updates: Partial<StockRepair>) => {
  const { error } = await supabase
    .from('stock_repairs' as any)
    .update(updates as any)
    .eq('id', repairId);
  if (error) throw error;
};

// ===== STOCK COUNTS =====

export const fetchStockCounts = async (companyId: string) => {
  const { data, error } = await supabase
    .from('stock_items' as any)
    .select('status')
    .eq('company_id', companyId);
  if (error) throw error;

  const counts: Record<string, number> = {
    ordered: 0, in_stock: 0, assigned: 0, in_repair: 0, sold: 0, scrapped: 0, total: 0,
  };
  (data || []).forEach((item: any) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    counts.total += 1;
  });
  return counts;
};

// ===== COMPOSITE OPERATIONS =====

export const receiveToStock = async (
  companyId: string,
  item: Partial<StockItem>,
  userId: string
) => {
  const created = await createStockItem({
    ...item,
    company_id: companyId,
    status: 'in_stock',
    reception_date: new Date().toISOString().split('T')[0],
  });

  await createMovement({
    company_id: companyId,
    stock_item_id: created.id,
    movement_type: 'reception',
    from_status: 'ordered',
    to_status: 'in_stock',
    performed_by: userId,
    notes: 'Réception en stock',
  });

  return created;
};

// ===== CONTRACT-SPECIFIC =====

export const fetchStockItemsByContract = async (contractId: string) => {
  const { data, error } = await supabase
    .from('stock_items' as any)
    .select(`
      *,
      supplier:suppliers(name),
      product:products(name),
      contract:contracts(contract_number, client_name)
    `)
    .eq('current_contract_id', contractId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as StockItem[];
};

export const recoverToStock = async (
  companyId: string,
  itemId: string,
  condition: StockCondition,
  userId: string
) => {
  await updateStockItem(itemId, {
    status: 'in_stock',
    condition,
    current_contract_id: null,
    current_contract_equipment_id: null,
  });
  await createMovement({
    company_id: companyId,
    stock_item_id: itemId,
    movement_type: 'unassign_contract',
    from_status: 'assigned',
    to_status: 'in_stock',
    performed_by: userId,
    notes: `Récupération fin de contrat - condition: ${CONDITION_CONFIG[condition].label}`,
  });
};

export const sellItem = async (companyId: string, itemId: string, userId: string) => {
  await updateStockItem(itemId, {
    status: 'sold',
    current_contract_id: null,
    current_contract_equipment_id: null,
  });
  await createMovement({
    company_id: companyId,
    stock_item_id: itemId,
    movement_type: 'sell',
    from_status: 'assigned',
    to_status: 'sold',
    performed_by: userId,
    notes: 'Vente au client',
  });
};

export const scrapItem = async (companyId: string, itemId: string, userId: string) => {
  await updateStockItem(itemId, {
    status: 'scrapped',
    current_contract_id: null,
    current_contract_equipment_id: null,
  });
  await createMovement({
    company_id: companyId,
    stock_item_id: itemId,
    movement_type: 'scrap',
    from_status: 'assigned',
    to_status: 'scrapped',
    performed_by: userId,
    notes: 'Mise au rebut',
  });
};

export const performSwap = async (
  companyId: string,
  oldItemId: string,
  newItemId: string,
  contractId: string,
  contractEquipmentId: string | null,
  reason: string,
  userId: string
) => {
  // 1. Old item: assigned -> in_repair
  await updateStockItem(oldItemId, {
    status: 'in_repair',
    current_contract_id: null,
    current_contract_equipment_id: null,
  });
  await createMovement({
    company_id: companyId,
    stock_item_id: oldItemId,
    movement_type: 'swap_out',
    from_status: 'assigned',
    to_status: 'in_repair',
    contract_id: contractId,
    related_stock_item_id: newItemId,
    performed_by: userId,
    notes: `Swap out: ${reason}`,
  });

  // 2. New item: in_stock -> assigned
  await updateStockItem(newItemId, {
    status: 'assigned',
    current_contract_id: contractId,
    current_contract_equipment_id: contractEquipmentId,
  });
  await createMovement({
    company_id: companyId,
    stock_item_id: newItemId,
    movement_type: 'swap_in',
    from_status: 'in_stock',
    to_status: 'assigned',
    contract_id: contractId,
    related_stock_item_id: oldItemId,
    performed_by: userId,
    notes: `Swap in: remplacement`,
  });

  // 3. Create repair for old item
  await createRepair({
    company_id: companyId,
    stock_item_id: oldItemId,
    reason,
    status: 'pending',
    repair_cost: 0,
    started_at: new Date().toISOString().split('T')[0],
  });
};
