import { useCallback, useEffect, useState } from "react";
import { SAAS_PLANS_LIST, type SaasPlan } from "@/config/saasPlans";
import { fetchSaasPlans } from "@/services/saasPlansService";

/**
 * Grille tarifaire SaaS depuis la DB (éditable par le super_admin), avec repli
 * immédiat sur la constante typée le temps du chargement / en cas d'erreur.
 */
export const useSaasPlans = (opts?: { includeInactive?: boolean }) => {
  const [plans, setPlans] = useState<SaasPlan[]>(SAAS_PLANS_LIST);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSaasPlans(opts);
      setPlans(data);
    } finally {
      setLoading(false);
    }
  }, [opts?.includeInactive]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { plans, loading, reload };
};
