// Service côté PARTENAIRE/BROKER apporteur d'un financeur (Winlease) :
// profil, grille attribuée, dépôt et suivi de ses demandes de financement.
// L'insertion passe par la RPC SECURITY DEFINER create_financing_request
// (coefficient recalculé serveur depuis la grille — anti-falsification).
import { supabase } from "@/integrations/supabase/client";
import {
  CoefficientGrid,
  CoefficientGridRange,
  FinancingPartner,
  FinancingRequestClient,
  FinancingRequestEquipmentLine,
} from "@/types/financeur";

export const getMyPartnerProfile = async (): Promise<FinancingPartner | null> => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await supabase
    .from("financing_partners" as any)
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as FinancingPartner) || null;
};

export const getMyGrid = async (
  partner: FinancingPartner
): Promise<CoefficientGrid | null> => {
  if (!partner.coefficient_grid_id) return null;
  const { data, error } = await supabase
    .from("coefficient_grids" as any)
    .select("*")
    .eq("id", partner.coefficient_grid_id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: rangesData, error: rangesError } = await supabase
    .from("coefficient_grid_ranges" as any)
    .select("*")
    .eq("grid_id", partner.coefficient_grid_id)
    .order("duration_months")
    .order("min");
  if (rangesError) throw rangesError;
  return {
    ...(data as unknown as CoefficientGrid),
    ranges: (rangesData as unknown as CoefficientGridRange[]) || [],
  };
};

export interface PartnerRequestSummary {
  id: string;
  client_name: string;
  amount: number;
  monthly_payment: number;
  coefficient: number;
  duration: number;
  workflow_status: string;
  created_at: string;
}

export const getMyRequests = async (): Promise<PartnerRequestSummary[]> => {
  // La RLS restreint déjà aux offres du partenaire connecté
  const { data, error } = await supabase
    .from("offers")
    .select("id, client_name, amount, monthly_payment, coefficient, duration, workflow_status, created_at")
    .eq("type", "financing_request")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as PartnerRequestSummary[]) || [];
};

export const getMyRequestDetail = async (offerId: string) => {
  const { data: offer, error } = await supabase
    .from("offers")
    .select("id, client_name, client_email, amount, monthly_payment, coefficient, duration, workflow_status, created_at, remarks, client_id")
    .eq("id", offerId)
    .maybeSingle();
  if (error) throw error;
  if (!offer) return null;
  const { data: equipment, error: eqError } = await supabase
    .from("offer_equipment")
    .select("id, title, purchase_price, quantity, monthly_payment")
    .eq("offer_id", offerId);
  if (eqError) throw eqError;
  return { offer, equipment: equipment || [] };
};

export const getMyClients = async () => {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, company, email, vat_number")
    .order("name");
  if (error) throw error;
  return data || [];
};

export const createFinancingRequest = async (
  client: FinancingRequestClient,
  equipment: FinancingRequestEquipmentLine[],
  duration: number,
  remarks?: string
): Promise<string> => {
  const { data, error } = await supabase.rpc("create_financing_request" as any, {
    p_client: client,
    p_equipment: equipment,
    p_duration: duration,
    p_remarks: remarks || null,
  });
  if (error) throw error;
  return data as unknown as string;
};
