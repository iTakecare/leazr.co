import React from "react";
import { useStockRepairs } from "@/hooks/useStockItems";
import { REPAIR_STATUS_CONFIG } from "@/services/stockService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const StockRepairList: React.FC = () => {
  const { repairs, isLoading } = useStockRepairs();

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  if (repairs.length === 0) return <div className="text-center py-8 text-muted-foreground">Aucune réparation enregistrée</div>;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Raison</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Réparateur</TableHead>
            <TableHead className="text-right">Coût</TableHead>
            <TableHead>Début</TableHead>
            <TableHead>Fin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {repairs.map(r => {
            const statusCfg = REPAIR_STATUS_CONFIG[r.status] || REPAIR_STATUS_CONFIG.pending;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{r.stock_item?.title || '-'}</p>
                    {r.stock_item?.serial_number && (
                      <p className="text-xs font-mono text-muted-foreground">{r.stock_item.serial_number}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{r.reason}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${statusCfg.bgColor} ${statusCfg.color} border text-xs`}>
                    {statusCfg.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{r.supplier?.name || '-'}</TableCell>
                <TableCell className="text-right text-xs">{r.repair_cost?.toFixed(2)} €</TableCell>
                <TableCell className="text-xs">{format(new Date(r.started_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                <TableCell className="text-xs">
                  {r.completed_at ? format(new Date(r.completed_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default StockRepairList;
