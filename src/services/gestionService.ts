import { supabase } from "@/integrations/supabase/client";

// Vue d'ensemble Gestion : revenus (factures de vente) ET dépenses (factures
// d'achat) côte à côte, avec détail facture par facture.

export interface SalesInvoiceDetail {
  id: string;
  invoice_number: string | null;
  amount: number;
  status: string;
  invoice_date: string | null;
  paid_at: string | null;
  client_name: string | null;
  leaser_name: string | null;
  contract_id: string | null;
  is_credit: boolean; // note de crédit côté vente
  lines: Array<{ title: string; quantity: number; unit: number }>;
}

export interface GestionOverview {
  revenues: {
    total: number;
    byMonth: Record<string, number>;
    invoices: SalesInvoiceDetail[];
  };
  marginBrut: number;
  marginPct: number | null;
}

const MONTH = (d: string | null) => (d || "").slice(0, 7);

export const getSalesOverview = async (companyId: string, fromDate: string, costCenterId?: string | null): Promise<GestionOverview> => {
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, amount, status, invoice_date, paid_at, leaser_name, contract_id, credited_amount, billing_data")
    .eq("company_id", companyId)
    .gte("invoice_date", fromDate)
    .order("invoice_date", { ascending: false });
  if (costCenterId) query = query.eq("cost_center_id", costCenterId);
  const { data, error } = await query;
  if (error) throw error;

  const invoices: SalesInvoiceDetail[] = (data || [])
    .filter((i: any) => i.status !== "cancelled")
    .map((i: any) => {
      const bd = i.billing_data || {};
      return {
        id: i.id,
        invoice_number: i.invoice_number,
        amount: i.amount || 0,
        status: i.status,
        invoice_date: i.invoice_date,
        paid_at: i.paid_at,
        client_name: bd.contract_data?.client_name || bd.client_data?.company || bd.client_data?.name || null,
        leaser_name: i.leaser_name,
        contract_id: i.contract_id,
        is_credit: false,
        lines: (bd.equipment_data || []).map((l: any) => ({
          title: l.title || "",
          quantity: l.quantity || 1,
          unit: l.selling_price_excl_vat || 0,
        })),
      };
    });

  const byMonth: Record<string, number> = {};
  let total = 0;
  for (const i of invoices) {
    total += i.amount;
    const m = MONTH(i.invoice_date);
    if (m) byMonth[m] = (byMonth[m] || 0) + i.amount;
  }

  return {
    revenues: { total, byMonth, invoices },
    marginBrut: 0, // calculé dans le composant (avec les dépenses)
    marginPct: null,
  };
};
