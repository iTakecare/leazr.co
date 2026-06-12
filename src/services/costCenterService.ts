import { supabase } from "@/integrations/supabase/client";

export interface CostCenter {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  country: string;
  currency: string;
  is_headquarters: boolean;
  parent_id: string | null;
  is_active: boolean;
}

export interface SharingPolicy {
  id?: string;
  cost_center_id: string;
  share_financial_aggregates: boolean;
  share_invoice_detail: boolean;
  share_client_data: boolean;
  share_hr_data: boolean;
  share_accounting: boolean;
  notes: string | null;
}

export const getCostCenters = async (companyId: string): Promise<CostCenter[]> => {
  const { data, error } = await supabase
    .from("cost_centers" as any)
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("is_headquarters", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data || []) as unknown as CostCenter[];
};

export const createCostCenter = async (
  companyId: string,
  c: { name: string; code?: string; country: string; currency: string },
): Promise<CostCenter> => {
  const { data, error } = await supabase
    .from("cost_centers" as any)
    .insert({ company_id: companyId, ...c, is_headquarters: false })
    .select()
    .single();
  if (error) throw error;
  // politique par défaut prudente (agrégats + compta OK, détail/clients/RH non)
  await supabase.from("cost_center_sharing_policy" as any).insert({
    company_id: companyId,
    cost_center_id: (data as any).id,
    share_financial_aggregates: true,
    share_invoice_detail: false,
    share_client_data: false,
    share_hr_data: false,
    share_accounting: true,
  });
  return data as unknown as CostCenter;
};

export const updateCostCenter = async (id: string, patch: Partial<CostCenter>) => {
  const { error } = await supabase
    .from("cost_centers" as any)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const getSharingPolicies = async (companyId: string): Promise<SharingPolicy[]> => {
  const { data, error } = await supabase
    .from("cost_center_sharing_policy" as any)
    .select("*")
    .eq("company_id", companyId);
  if (error) throw error;
  return (data || []) as unknown as SharingPolicy[];
};

export const updateSharingPolicy = async (companyId: string, policy: SharingPolicy) => {
  const { error } = await supabase
    .from("cost_center_sharing_policy" as any)
    .upsert(
      {
        company_id: companyId,
        cost_center_id: policy.cost_center_id,
        share_financial_aggregates: policy.share_financial_aggregates,
        share_invoice_detail: policy.share_invoice_detail,
        share_client_data: policy.share_client_data,
        share_hr_data: policy.share_hr_data,
        share_accounting: policy.share_accounting,
        notes: policy.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cost_center_id" },
    );
  if (error) throw error;
};
