import { useEffect, useState } from "react";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";
import {
  fetchCompanySubscriptionState,
  type AccountStatus,
} from "@/services/saasSubscriptionService";

export interface SubscriptionStatus {
  loading: boolean;
  status: AccountStatus | null;
  plan: string | null;
  /** true quand l'essai est terminé sans abonnement → blocage doux. */
  isExpired: boolean;
  isTrial: boolean;
  /** Jours restants d'essai (0 si expiré / non applicable). */
  trialDaysLeft: number;
  /** L'app devrait passer en lecture seule quand true. */
  isReadOnly: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * État d'abonnement de la company courante, pour le blocage doux de fin d'essai
 * (bandeau d'upgrade + lecture seule). Ne bloque rien tout seul : expose les
 * drapeaux que la bannière et les écrans consomment.
 */
export const useSubscriptionStatus = (): SubscriptionStatus => {
  const [state, setState] = useState<SubscriptionStatus>({
    loading: true,
    status: null,
    plan: null,
    isExpired: false,
    isTrial: false,
    trialDaysLeft: 0,
    isReadOnly: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const companyId = await getCurrentUserCompanyId();
        if (!companyId) {
          if (!cancelled) setState((s) => ({ ...s, loading: false }));
          return;
        }
        const sub = await fetchCompanySubscriptionState(companyId);
        if (cancelled) return;

        const status = (sub?.account_status ?? null) as AccountStatus | null;
        const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;
        const now = Date.now();

        const isTrial = status === "trial";
        const trialDaysLeft =
          isTrial && trialEnds ? Math.max(0, Math.ceil((trialEnds - now) / DAY_MS)) : 0;
        // Expiré si le statut le dit, ou si l'essai est dépassé sans abonnement
        // (filet en attendant le passage du cron expire_overdue_trials).
        const isExpired =
          status === "expired" ||
          (isTrial && !!trialEnds && trialEnds < now && !sub?.mollie_subscription_id);

        setState({
          loading: false,
          status,
          plan: sub?.plan ?? null,
          isExpired,
          isTrial,
          trialDaysLeft,
          isReadOnly: isExpired,
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};
