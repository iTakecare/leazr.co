import { useCallback, useEffect, useState } from "react";
import {
  fetchModulesCatalog,
  fetchPlanModules,
  type SaasModule,
} from "@/services/saasModulesService";

/**
 * Catalogue global des modules Leazr + modules inclus par plan (socle hybride).
 */
export const useModulesCatalog = () => {
  const [catalog, setCatalog] = useState<SaasModule[]>([]);
  const [planModules, setPlanModules] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, pm] = await Promise.all([fetchModulesCatalog(), fetchPlanModules()]);
      setCatalog(cat);
      setPlanModules(pm);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { catalog, planModules, loading, reload };
};
