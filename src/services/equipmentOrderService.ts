import { supabase } from "@/integrations/supabase/client";

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
  // Context fields for global view
  source_type?: 'offer' | 'contract';
  source_id?: string;
  client_name?: string;
  source_reference?: string;
  source_date?: string;
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
  const { error } = await supabase
    .from('contract_equipment')
    .update(data as any)
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

export const fetchAllEquipmentOrders = async (companyId: string) => {
  // Fetch offer equipment with order tracking
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

  // Fetch contract equipment with order tracking
  const { data: contractEquipment, error: contractError } = await supabase
    .from('contract_equipment')
    .select(`
      id, title, quantity, purchase_price,
      order_status, supplier_id, supplier_price, order_date, order_reference, reception_date, order_notes,
      contracts!inner(id, contract_number, client_name, company_id, created_at)
    `)
    .eq('contracts.company_id', companyId);

  if (contractError) throw contractError;

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
    })),
    ...(contractEquipment || []).map((eq: any) => ({
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
      product_id: null,
      source_type: 'contract' as const,
      source_id: eq.contracts?.id,
      client_name: eq.contracts?.client_name,
      source_reference: eq.contracts?.contract_number || 'N/A',
      source_date: eq.contracts?.created_at,
    })),
  ];

  return items;
};
