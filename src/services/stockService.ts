import { supabase } from "@/integrations/supabase/client";

export type StockStatus = 'ordered' | 'in_stock' | 'reserved' | 'assigned' | 'in_repair' | 'sold' | 'scrapped';
export type StockCondition = 'new' | 'like_new' | 'good' | 'fair' | 'defective';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned';
export type MovementType = 'reception' | 'assign_contract' | 'unassign_contract' | 'swap_out' | 'swap_in' | 'repair_start' | 'repair_end' | 'scrap' | 'sell' | 'rachat_client' | 'contract_buyback' | 'reserve_offer' | 'release_offer';

export type StockSource = 'purchase' | 'contract_buyback';

export const STOCK_SOURCE_CONFIG: Record<StockSource, { label: string; color: string; bgColor: string }> = {
  purchase: { label: 'Achat', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
  contract_buyback: { label: 'Reprise contrat', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
};

export interface StockItem {
  id: string;
  company_id: string;
  serial_number: string | null;
  serial_numbers: string[];
  product_id: string | null;
  title: string;
  status: StockStatus;
  condition: StockCondition;
  purchase_price: number;
  quantity: number;
  unit_price: number;
  supplier_id: string | null;
  order_reference: string | null;
  purchase_date: string | null;
  reception_date: string | null;
  current_contract_id: string | null;
  current_contract_equipment_id: string | null;
  source: StockSource;
  buyback_price: number | null;
  source_contract_id: string | null;
  source_contract_equipment_id: string | null;
  location: string | null;
  notes: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  warranty_end_date: string | null;
  cpu: string | null;
  memory: string | null;
  storage: string | null;
  color: string | null;
  grade: string | null;
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
  reserved: { label: 'Réservé', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-200' },
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

// ===== STOCK ITEM ADDITIONAL COSTS =====

export type StockCostCategory = 'repair' | 'upgrade' | 'part' | 'shipping' | 'other';

export interface StockItemCost {
  id: string;
  company_id: string;
  stock_item_id: string;
  label: string;
  amount: number;
  category: StockCostCategory;
  cost_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STOCK_COST_CATEGORY_CONFIG: Record<StockCostCategory, { label: string; color: string; bgColor: string }> = {
  repair: { label: 'Réparation', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-200' },
  upgrade: { label: 'Amélioration', color: 'text-indigo-700', bgColor: 'bg-indigo-100 border-indigo-200' },
  part: { label: 'Pièce détachée', color: 'text-cyan-700', bgColor: 'bg-cyan-100 border-cyan-200' },
  shipping: { label: 'Logistique', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
  other: { label: 'Autre', color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-200' },
};

export const fetchStockItemCosts = async (stockItemId: string): Promise<StockItemCost[]> => {
  const { data, error } = await supabase
    .from('stock_item_costs' as any)
    .select('*')
    .eq('stock_item_id', stockItemId)
    .order('cost_date', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as StockItemCost[];
};

export const createStockItemCost = async (
  cost: Omit<StockItemCost, 'id' | 'created_at' | 'updated_at'>
): Promise<StockItemCost> => {
  const { data, error } = await supabase
    .from('stock_item_costs' as any)
    .insert(cost as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as StockItemCost;
};

export const updateStockItemCost = async (
  costId: string,
  updates: Partial<Omit<StockItemCost, 'id' | 'company_id' | 'stock_item_id' | 'created_at' | 'created_by'>>
): Promise<void> => {
  const { error } = await supabase
    .from('stock_item_costs' as any)
    .update(updates as any)
    .eq('id', costId);
  if (error) throw error;
};

export const deleteStockItemCost = async (costId: string): Promise<void> => {
  const { error } = await supabase
    .from('stock_item_costs' as any)
    .delete()
    .eq('id', costId);
  if (error) throw error;
};

/** Sum of additional costs for a stock item. */
export const computeAdditionalCostsTotal = (costs: StockItemCost[]): number =>
  costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

/**
 * Returns a map of stock_item_id → total additional costs for the whole
 * company. Used by the global stock list to display the real cost.
 */
export const fetchStockCostTotalsByCompany = async (
  companyId: string
): Promise<Record<string, number>> => {
  const { data, error } = await supabase
    .from('stock_item_costs' as any)
    .select('stock_item_id, amount')
    .eq('company_id', companyId);
  if (error) throw error;
  const map: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    map[row.stock_item_id] = (map[row.stock_item_id] || 0) + (Number(row.amount) || 0);
  });
  return map;
};

// ===== STOCK ITEMS =====

export const fetchStockItems = async (companyId: string, statusFilter?: StockStatus) => {
  let query = supabase
    .from('stock_items' as any)
    .select(`
      *,
      supplier:suppliers(name),
      product:products(name),
      contract:contracts!current_contract_id(contract_number, client_name)
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
      contract:contracts!current_contract_id(contract_number, client_name)
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

export const duplicateStockItem = async (item: StockItem): Promise<StockItem> => {
  const { id, created_at, updated_at, supplier, product, contract, current_contract_id, current_contract_equipment_id, ...rest } = item;
  const newItem: any = {
    ...rest,
    title: `${item.title} (Copie)`,
    serial_number: null,
    serial_numbers: [],
    status: 'in_stock' as StockStatus,
    current_contract_id: null,
    current_contract_equipment_id: null,
  };
  const { data, error } = await supabase
    .from('stock_items' as any)
    .insert(newItem)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as StockItem;
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
      stock_item:stock_items!stock_item_id(title, serial_number)
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
      stock_item:stock_items!stock_item_id(title, serial_number),
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

// ===== BUYBACKABLE OVERVIEW =====

export type BuybackEndStatus = 'ending_soon' | 'expired' | 'completed';

export interface BuybackableEquipment {
  id: string;
  contract_id: string;
  title: string;
  serial_number: string | null;
  quantity: number;
  purchase_price: number | null;
  contract_number: string | null;
  client_name: string | null;
  contract_status: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_duration: number | null;
  lease_duration: number | null;
  delivery_date: string | null;
  /** Computed end date (ISO string or null) */
  computed_end_date: string | null;
  end_status: BuybackEndStatus;
  /** Days until end (negative = expired, 0 = today) */
  days_until_end: number | null;
}

const addMonths = (iso: string, months: number): Date => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d;
};

const computeEnd = (c: {
  contract_end_date?: string | null;
  contract_start_date?: string | null;
  contract_duration?: number | null;
  lease_duration?: number | null;
  delivery_date?: string | null;
}): Date | null => {
  if (c.contract_end_date) return new Date(c.contract_end_date);
  const dur = c.contract_duration || c.lease_duration;
  if (c.contract_start_date && dur) return addMonths(c.contract_start_date, dur);
  if (c.delivery_date && dur) return addMonths(c.delivery_date, dur);
  return null;
};

/**
 * Liste tout le matériel non encore racheté dont le contrat parent est:
 *  - terminé (`completed`), OU
 *  - expiré (date de fin dépassée), OU
 *  - bientôt fini (≤ `withinDays` jours, défaut 30)
 *
 * Sert à donner un overview du stock potentiel à reprendre.
 */
export const fetchBuybackableEquipments = async (
  companyId: string,
  withinDays: number = 30
): Promise<BuybackableEquipment[]> => {
  const { data, error } = await supabase
    .from('contract_equipment')
    .select(`
      id,
      contract_id,
      title,
      serial_number,
      quantity,
      purchase_price,
      bought_back_at,
      contracts!inner (
        company_id,
        contract_number,
        client_name,
        status,
        contract_start_date,
        contract_end_date,
        contract_duration,
        lease_duration,
        delivery_date
      )
    `)
    .is('bought_back_at', null)
    .eq('contracts.company_id', companyId);

  if (error) throw error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: BuybackableEquipment[] = [];

  for (const row of data || []) {
    const contract: any = (row as any).contracts;
    if (!contract) continue;

    const status = contract.status as string | null;
    const endDate = computeEnd(contract);

    let endStatus: BuybackEndStatus | null = null;
    let daysUntilEnd: number | null = null;

    if (status === 'completed') {
      endStatus = 'completed';
      if (endDate) {
        daysUntilEnd = Math.floor(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    } else if (endDate) {
      const diffMs = endDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      daysUntilEnd = diffDays;
      if (diffDays < 0) endStatus = 'expired';
      else if (diffDays <= withinDays) endStatus = 'ending_soon';
    }

    if (!endStatus) continue;

    results.push({
      id: (row as any).id,
      contract_id: (row as any).contract_id,
      title: (row as any).title,
      serial_number: (row as any).serial_number || null,
      quantity: (row as any).quantity || 1,
      purchase_price: (row as any).purchase_price || null,
      contract_number: contract.contract_number || null,
      client_name: contract.client_name || null,
      contract_status: status,
      contract_start_date: contract.contract_start_date || null,
      contract_end_date: contract.contract_end_date || null,
      contract_duration: contract.contract_duration || null,
      lease_duration: contract.lease_duration || null,
      delivery_date: contract.delivery_date || null,
      computed_end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      end_status: endStatus,
      days_until_end: daysUntilEnd,
    });
  }

  // Sort: expired first, then ending_soon by closest, then completed by most recent end
  return results.sort((a, b) => {
    const order: Record<BuybackEndStatus, number> = {
      expired: 0,
      ending_soon: 1,
      completed: 2,
    };
    if (order[a.end_status] !== order[b.end_status]) {
      return order[a.end_status] - order[b.end_status];
    }
    return (a.days_until_end ?? 0) - (b.days_until_end ?? 0);
  });
};

export const BUYBACK_END_STATUS_CONFIG: Record<BuybackEndStatus, { label: string; color: string; bgColor: string }> = {
  expired: { label: 'Expiré', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
  ending_soon: { label: 'Bientôt', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-200' },
  completed: { label: 'Terminé', color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200' },
};

// ===== OFFER LIFECYCLE =====

/**
 * Réserve un stock_item pour une offre en cours.
 * Passe le statut `in_stock` → `reserved`. Retourne false si l'item n'est plus
 * disponible (déjà réservé / assigné / vendu) — la réservation est silencieuse-
 * ment ignorée pour ne pas faire échouer toute la sauvegarde de l'offre.
 */
export const reserveStockItemForOffer = async (
  companyId: string,
  stockItemId: string,
  offerId: string,
  userId: string
): Promise<boolean> => {
  // Conditional update: only if currently in_stock
  const { data, error } = await supabase
    .from('stock_items' as any)
    .update({ status: 'reserved' } as any)
    .eq('id', stockItemId)
    .eq('status', 'in_stock')
    .select('id');
  if (error) {
    console.error('reserveStockItemForOffer error:', error);
    return false;
  }
  const reserved = (data || []).length > 0;
  if (reserved) {
    await createMovement({
      company_id: companyId,
      stock_item_id: stockItemId,
      movement_type: 'reserve_offer',
      from_status: 'in_stock',
      to_status: 'reserved',
      performed_by: userId,
      notes: `Réservé pour l'offre ${offerId}`,
    });
  }
  return reserved;
};

/**
 * Libère toutes les réservations stock liées à une offre.
 * Trouvable via offer_equipment.source_stock_item_id.
 * Passe `reserved` → `in_stock`.
 */
export const releaseStockReservationsForOffer = async (
  companyId: string,
  offerId: string,
  userId: string
): Promise<number> => {
  const { data: equipments, error: eqErr } = await supabase
    .from('offer_equipment')
    .select('source_stock_item_id')
    .eq('offer_id', offerId)
    .not('source_stock_item_id', 'is', null);
  if (eqErr) {
    console.error('releaseStockReservationsForOffer (load) error:', eqErr);
    return 0;
  }
  const stockIds = (equipments || [])
    .map((e: any) => e.source_stock_item_id)
    .filter((id: any) => !!id);
  if (stockIds.length === 0) return 0;

  const { data, error } = await supabase
    .from('stock_items' as any)
    .update({ status: 'in_stock' } as any)
    .in('id', stockIds)
    .eq('status', 'reserved')
    .select('id');
  if (error) {
    console.error('releaseStockReservationsForOffer (update) error:', error);
    return 0;
  }
  const released = (data || []) as any[];
  for (const item of released) {
    await createMovement({
      company_id: companyId,
      stock_item_id: item.id,
      movement_type: 'release_offer',
      from_status: 'reserved',
      to_status: 'in_stock',
      performed_by: userId,
      notes: `Libéré (offre ${offerId})`,
    });
  }
  return released.length;
};

/**
 * Convertit les réservations d'une offre en assignations à un contrat.
 * Recherche les offer_equipment.source_stock_item_id de l'offre, et passe
 * les stock_items correspondants à `assigned` avec current_contract_id.
 */
export const assignReservedStockToContract = async (
  companyId: string,
  offerId: string,
  contractId: string,
  userId: string
): Promise<number> => {
  const { data: equipments, error: eqErr } = await supabase
    .from('offer_equipment')
    .select('source_stock_item_id')
    .eq('offer_id', offerId)
    .not('source_stock_item_id', 'is', null);
  if (eqErr) {
    console.error('assignReservedStockToContract (load) error:', eqErr);
    return 0;
  }
  const stockIds = (equipments || [])
    .map((e: any) => e.source_stock_item_id)
    .filter((id: any) => !!id);
  if (stockIds.length === 0) return 0;

  const { data, error } = await supabase
    .from('stock_items' as any)
    .update({
      status: 'assigned',
      current_contract_id: contractId,
    } as any)
    .in('id', stockIds)
    .in('status', ['reserved', 'in_stock'])
    .select('id');
  if (error) {
    console.error('assignReservedStockToContract (update) error:', error);
    return 0;
  }
  const assigned = (data || []) as any[];
  for (const item of assigned) {
    await createMovement({
      company_id: companyId,
      stock_item_id: item.id,
      movement_type: 'assign_contract',
      from_status: 'reserved',
      to_status: 'assigned',
      contract_id: contractId,
      performed_by: userId,
      notes: `Assigné via offre ${offerId}`,
    });
  }
  return assigned.length;
};

// ===== OFFER COMPOSER =====

/**
 * Stock items disponibles pour ajouter à une offre.
 * Retourne uniquement le matériel `in_stock` (non encore réservé / attribué).
 */
export const fetchAvailableStockItems = async (companyId: string): Promise<StockItem[]> => {
  const { data, error } = await supabase
    .from('stock_items' as any)
    .select(`
      *,
      supplier:suppliers(name),
      product:products(name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'in_stock')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as StockItem[];
};

// ===== CONTRACT-SPECIFIC =====

export const fetchStockItemsByContract = async (contractId: string) => {
  const { data, error } = await supabase
    .from('stock_items' as any)
    .select(`
      *,
      supplier:suppliers(name),
      product:products(name),
      contract:contracts!current_contract_id(contract_number, client_name)
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
  userId: string,
  contractId?: string | null
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
    contract_id: contractId || null,
    performed_by: userId,
    notes: `Récupération fin de contrat - condition: ${CONDITION_CONFIG[condition].label}`,
  });
};

export const sellItem = async (
  companyId: string,
  itemId: string,
  userId: string,
  contractId?: string | null
) => {
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
    contract_id: contractId || null,
    performed_by: userId,
    notes: 'Vente au client',
  });
};

/** Rachat client : le client achète le matériel à la fin du leasing */
export const racheterItem = async (
  companyId: string,
  itemId: string,
  userId: string,
  contractId?: string | null
) => {
  await updateStockItem(itemId, {
    status: 'sold',
    current_contract_id: null,
    current_contract_equipment_id: null,
  });
  await createMovement({
    company_id: companyId,
    stock_item_id: itemId,
    movement_type: 'rachat_client',
    from_status: 'assigned',
    to_status: 'sold',
    contract_id: contractId || null,
    performed_by: userId,
    notes: 'Rachat client (payé)',
  });
};

/**
 * Reprise d'un équipement de contrat en stock.
 *
 * Crée un nouveau `stock_item` (source='contract_buyback') à partir d'un
 * `contract_equipment` (matériel rendu par le client en fin/évolution de
 * contrat), avec la valeur de rachat payée au leaser.
 *
 * - Marque l'équipement de contrat comme repris (bought_back_at + price)
 * - Crée le stock_item avec status='in_stock'
 * - Crée un mouvement 'contract_buyback' tracé sur le contrat d'origine
 *
 * Retourne le stock_item créé.
 */
export const buyBackContractEquipment = async (params: {
  companyId: string;
  contractId: string;
  contractEquipment: {
    id: string;
    title: string;
    serial_number?: string | null;
  };
  buybackPrice: number;
  condition: StockCondition;
  notes?: string | null;
  userId: string;
}): Promise<StockItem> => {
  const { companyId, contractId, contractEquipment, buybackPrice, condition, notes, userId } = params;

  const today = new Date().toISOString().split('T')[0];

  const created = await createStockItem({
    company_id: companyId,
    title: contractEquipment.title,
    serial_number: contractEquipment.serial_number || null,
    status: 'in_stock',
    condition,
    purchase_price: buybackPrice,
    unit_price: buybackPrice,
    quantity: 1,
    source: 'contract_buyback',
    buyback_price: buybackPrice,
    source_contract_id: contractId,
    source_contract_equipment_id: contractEquipment.id,
    purchase_date: today,
    reception_date: today,
    notes: notes || null,
  });

  await createMovement({
    company_id: companyId,
    stock_item_id: created.id,
    movement_type: 'contract_buyback',
    from_status: null,
    to_status: 'in_stock',
    contract_id: contractId,
    cost: buybackPrice,
    performed_by: userId,
    notes: `Reprise contrat - rachat ${buybackPrice.toFixed(2)} €`,
  });

  const { error: ceError } = await supabase
    .from('contract_equipment')
    .update({
      bought_back_at: new Date().toISOString(),
      bought_back_price: buybackPrice,
    } as any)
    .eq('id', contractEquipment.id);
  if (ceError) throw ceError;

  return created;
};

export const scrapItem = async (
  companyId: string,
  itemId: string,
  userId: string,
  contractId?: string | null
) => {
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
    contract_id: contractId || null,
    performed_by: userId,
    notes: 'Mise au rebut',
  });
};

/** Récupère les mouvements de fin de contrat (retour / rachat / rebut) pour un contrat donné */
export const fetchContractEndMovements = async (contractId: string) => {
  const { data, error } = await supabase
    .from('stock_movements' as any)
    .select(`
      *,
      stock_item:stock_items!stock_item_id(title, serial_number, condition)
    `)
    .eq('contract_id', contractId)
    .in('movement_type', ['unassign_contract', 'sell', 'scrap', 'rachat_client', 'contract_buyback'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as StockMovement[];
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
