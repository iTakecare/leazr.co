import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { RefreshCw, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { EquipmentSwap } from "@/services/stockService";

/**
 * Bandeau d'indication des swaps d'appareils survenus sur le contrat issu de
 * cette demande. Affiché sur la fiche demande pour garder la trace côté offre.
 */
const EquipmentSwapNotice: React.FC<{ offerId: string }> = ({ offerId }) => {
  const [swaps, setSwaps] = useState<EquipmentSwap[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("equipment_swaps" as any)
      .select("*")
      .eq("offer_id", offerId)
      .order("swapped_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setSwaps((data as unknown as EquipmentSwap[]) || []);
      });
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  if (swaps.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-2">
        <RefreshCw className="h-4 w-4" />
        {swaps.length === 1 ? "Swap d'appareil" : `${swaps.length} swaps d'appareil`}
      </div>
      <ul className="space-y-1.5">
        {swaps.map((s) => (
          <li key={s.id} className="text-xs text-amber-900 flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{s.old_title}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">{s.new_title}</span>
            {s.new_serial_number && <span className="text-amber-700">(S/N {s.new_serial_number})</span>}
            <span className="text-amber-700">
              · {format(new Date(s.swapped_at), "dd MMM yyyy", { locale: fr })}
            </span>
            <span className="text-amber-700">
              · écart {s.price_delta > 0 ? "+" : ""}{formatCurrency(s.price_delta)}
            </span>
            {s.reason && <span className="text-amber-700 italic">— {s.reason}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EquipmentSwapNotice;
