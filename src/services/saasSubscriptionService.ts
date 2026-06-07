import { supabase } from "@/integrations/supabase/client";
import type { SaasPlanId } from "@/config/saasPlans";

export type AccountStatus = "trial" | "active" | "expired" | "cancelled";

export interface CompanySubscriptionState {
  plan: string | null;
  account_status: AccountStatus | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  mollie_subscription_id: string | null;
}

/**
 * Souscrit l'entreprise de l'utilisateur courant à un plan SaaS via Mollie
 * (SEPA Direct Debit récurrent). La company est résolue côté serveur depuis le
 * profil de l'appelant — aucun company_id n'est transmis depuis le client.
 */
export const subscribeToPlan = async (params: {
  plan: SaasPlanId;
  iban: string;
  accountHolder: string;
  bic?: string;
}): Promise<{ success: boolean; error?: string; mollie_subscription_id?: string }> => {
  const { data, error } = await supabase.functions.invoke("mollie-saas-subscribe", {
    body: params,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  return data;
};

/** Lit l'état d'abonnement de la company courante (RLS : sa propre ligne). */
export const fetchCompanySubscriptionState = async (
  companyId: string,
): Promise<CompanySubscriptionState | null> => {
  const { data, error } = await supabase
    .from("companies")
    .select("plan, account_status, trial_ends_at, subscription_ends_at, mollie_subscription_id")
    .eq("id", companyId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CompanySubscriptionState;
};
