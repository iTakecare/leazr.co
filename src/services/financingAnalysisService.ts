// Service d'analyse financeur (Winlease Phase 2) : rapport de crédit
// Graydon-CreditSafe, encours vs limites, recommandation IA de décision.
import { supabase } from "@/integrations/supabase/client";

export interface CreditReportSummary {
  id: string | null;
  fetched_at: string;
  connect_id?: string;
  company_name?: string | null;
  credit_score: string | null;
  credit_score_description?: string | null;
  credit_limit: number | null;
  provider_score?: number | null;
  provider_score_max?: number | null;
  status?: string | null;
}

export interface FinancingExposure {
  client_outstanding: number;
  client_accepted_count: number;
  partner_outstanding: number;
  partner_accepted_count: number;
}

export interface AiRecommendation {
  suggested_score: 'A' | 'B' | 'C' | 'D';
  confidence: 'low' | 'medium' | 'high';
  rationale: string;
  red_flags: string[];
  positive_signals: string[];
  conditions: string[];
  rejection_category: string | null;
  model?: string;
  generated_at?: string;
}

export const getGraydonConfig = async (): Promise<{ configured: boolean; source: string | null }> => {
  const { data, error } = await supabase.functions.invoke('graydon-api', {
    body: { action: 'get_config' },
  });
  if (error) throw error;
  return data;
};

export const fetchCreditReport = async (
  offerId: string
): Promise<{ success: boolean; report?: CreditReportSummary; error?: string; not_configured?: boolean }> => {
  const { data, error } = await supabase.functions.invoke('graydon-api', {
    body: { action: 'fetch_report', offerId },
  });
  if (error) return { success: false, error: error.message };
  return data;
};

export const getLatestCreditReport = async (clientId: string) => {
  const { data, error } = await supabase
    .from('credit_reports' as any)
    .select('id, credit_score, credit_limit, rating_description, company_name, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as any;
};

export const getFinancingExposure = async (
  clientId: string | null,
  partnerId: string | null
): Promise<FinancingExposure> => {
  const { data, error } = await supabase.rpc('get_financing_exposure' as any, {
    p_client_id: clientId,
    p_partner_id: partnerId,
  });
  if (error) throw error;
  return data as unknown as FinancingExposure;
};

export const runAiRecommendation = async (
  offerId: string
): Promise<{ success: boolean; recommendation?: AiRecommendation; error?: string }> => {
  const { data, error } = await supabase.functions.invoke('financing-decision-ai', {
    body: { offerId },
  });
  if (error) return { success: false, error: error.message };
  return data;
};

export const updateClientOutstandingLimit = async (
  clientId: string,
  limit: number | null
): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .update({ outstanding_limit: limit } as any)
    .eq('id', clientId);
  if (error) throw error;
};

export const getClientRiskInfo = async (clientId: string) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company, vat_number, kyc_score, kyc_score_reasons, company_creation_date, outstanding_limit')
    .eq('id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data as any;
};
