import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClientPromotion, PromotionPlacement } from "@/types/promotion";

/**
 * Récupère les bannières publicitaires actives pour l'espace client.
 * Le filtrage par société est assuré par la RLS (get_user_company_id),
 * on filtre ici sur l'état actif + la fenêtre de diffusion.
 */
export const useClientPromotions = (placement?: PromotionPlacement) => {
  const [promotions, setPromotions] = useState<ClientPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPromotions = async () => {
      setLoading(true);
      try {
        const nowIso = new Date().toISOString();
        let query = (supabase as any)
          .from("client_promotions")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (placement) query = query.eq("placement", placement);

        const { data, error } = await query;
        if (error) throw error;

        const visible = ((data || []) as ClientPromotion[]).filter((p) => {
          const startedOk = !p.starts_at || p.starts_at <= nowIso;
          const notEnded = !p.ends_at || p.ends_at >= nowIso;
          return startedOk && notEnded;
        });

        if (!cancelled) setPromotions(visible);
      } catch (err) {
        console.error("Erreur chargement promotions client:", err);
        if (!cancelled) setPromotions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPromotions();
    return () => {
      cancelled = true;
    };
  }, [placement]);

  return { promotions, loading };
};
