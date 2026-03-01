import React from "react";
import { useStockMovements } from "@/hooks/useStockItems";
import { STOCK_STATUS_CONFIG } from "@/services/stockService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MOVEMENT_LABELS: Record<string, string> = {
  reception: 'Réception',
  assign_contract: 'Attribution contrat',
  unassign_contract: 'Retrait contrat',
  swap_out: 'Swap sortie',
  swap_in: 'Swap entrée',
  repair_start: 'Début réparation',
  repair_end: 'Fin réparation',
  scrap: 'Mise au rebut',
  sell: 'Vente',
};

const StockMovementHistory: React.FC = () => {
  const { movements, isLoading } = useStockMovements();

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  if (movements.length === 0) return <div className="text-center py-8 text-muted-foreground">Aucun mouvement enregistré</div>;

  return (
    <div className="space-y-3">
      {movements.map(m => {
        const fromCfg = m.from_status ? STOCK_STATUS_CONFIG[m.from_status as keyof typeof STOCK_STATUS_CONFIG] : null;
        const toCfg = m.to_status ? STOCK_STATUS_CONFIG[m.to_status as keyof typeof STOCK_STATUS_CONFIG] : null;

        return (
          <div key={m.id} className="flex items-start gap-4 p-3 border rounded-lg bg-card">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(m.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {m.stock_item?.title || 'Article'} {m.stock_item?.serial_number ? `(${m.stock_item.serial_number})` : ''}
              </p>
              {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {fromCfg && (
                <Badge variant="outline" className={`${fromCfg.bgColor} ${fromCfg.color} text-[10px]`}>
                  {fromCfg.label}
                </Badge>
              )}
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              {toCfg && (
                <Badge variant="outline" className={`${toCfg.bgColor} ${toCfg.color} text-[10px]`}>
                  {toCfg.label}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockMovementHistory;
