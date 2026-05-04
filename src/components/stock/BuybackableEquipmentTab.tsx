/**
 * BuybackableEquipmentTab
 *
 * Overview du matériel potentiel à reprendre en stock:
 * - Tous les contract_equipment non encore rachetés (bought_back_at IS NULL)
 * - Dont le contrat est terminé, expiré, ou se termine sous 30 jours
 *
 * Permet de cliquer "Reprendre en stock" pour ouvrir directement le dialog
 * de rachat (réutilise BuyBackEquipmentDialog).
 */
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Warehouse,
  ExternalLink,
  PackageCheck,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  fetchBuybackableEquipments,
  BuybackableEquipment,
  BuybackEndStatus,
  BUYBACK_END_STATUS_CONFIG,
} from "@/services/stockService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import BuyBackEquipmentDialog from "./BuyBackEquipmentDialog";

const BuybackableEquipmentTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BuybackEndStatus | "all">("all");
  const [buyback, setBuyback] = useState<BuybackableEquipment | null>(null);

  const queryKey = ["buybackable-equipments", companyId];
  const { data: items = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchBuybackableEquipments(companyId!),
    enabled: !!companyId,
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.end_status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(s) ||
          (item.serial_number || "").toLowerCase().includes(s) ||
          (item.contract_number || "").toLowerCase().includes(s) ||
          (item.client_name || "").toLowerCase().includes(s);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      expired: items.filter((i) => i.end_status === "expired").length,
      ending_soon: items.filter((i) => i.end_status === "ending_soon").length,
      completed: items.filter((i) => i.end_status === "completed").length,
    };
  }, [items]);

  const handleBuybackSuccess = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["stock-items"] });
    queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
    setBuyback(null);
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total" value={counts.total} color="text-foreground" />
        <SummaryCard label="Expirés" value={counts.expired} color="text-red-700" />
        <SummaryCard label="Bientôt" value={counts.ending_soon} color="text-amber-700" />
        <SummaryCard label="Terminés" value={counts.completed} color="text-slate-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher (équipement, S/N, contrat, client)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as BuybackEndStatus | "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(BUYBACK_END_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-destructive">
          Erreur de chargement.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <PackageCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">
            {items.length === 0
              ? "Aucun matériel à reprendre actuellement"
              : "Aucun résultat pour ces filtres"}
          </p>
          <p className="text-xs mt-1 opacity-70">
            {items.length === 0 &&
              "Les contrats terminés ou bientôt expirés apparaîtront ici"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Équipement</TableHead>
                <TableHead className="text-xs">N° série</TableHead>
                <TableHead className="text-xs">Contrat</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Fin de contrat</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs text-right">Prix achat</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const cfg = BUYBACK_END_STATUS_CONFIG[item.end_status];
                const endDateLabel = item.computed_end_date
                  ? format(new Date(item.computed_end_date), "dd MMM yyyy", { locale: fr })
                  : "—";
                const daysHint = (() => {
                  if (item.days_until_end === null) return null;
                  if (item.end_status === "expired") {
                    return `Il y a ${Math.abs(item.days_until_end)} j`;
                  }
                  if (item.end_status === "ending_soon") {
                    return item.days_until_end === 0
                      ? "Aujourd'hui"
                      : `Dans ${item.days_until_end} j`;
                  }
                  return null;
                })();
                return (
                  <TableRow key={item.id} className="hover:bg-muted/40">
                    <TableCell className="text-sm font-medium">
                      {item.title}
                      {item.quantity > 1 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          × {item.quantity}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.serial_number || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.contract_number ? (
                        <Link
                          to={`/contracts/${item.contract_id}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {item.contract_number}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{item.client_name || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col leading-tight">
                        <span>{endDateLabel}</span>
                        {daysHint && (
                          <span className={`text-[10px] ${cfg.color}`}>{daysHint}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal ${cfg.bgColor} ${cfg.color}`}
                      >
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {item.purchase_price !== null
                        ? `${Number(item.purchase_price).toFixed(2)} €`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={() => setBuyback(item)}
                      >
                        <Warehouse className="h-3 w-3 mr-1" />
                        Reprendre
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Buyback dialog (reuses existing component) */}
      {buyback && companyId && (
        <BuyBackEquipmentDialog
          open={!!buyback}
          onOpenChange={(o) => !o && setBuyback(null)}
          contractId={buyback.contract_id}
          companyId={companyId}
          contractEquipment={{
            id: buyback.id,
            title: buyback.title,
            serial_number: buyback.serial_number,
            purchase_price: buyback.purchase_price ?? undefined,
          }}
          onSuccess={handleBuybackSuccess}
        />
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="border rounded-lg px-3 py-2 bg-card">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-2xl font-semibold ${color}`}>{value}</div>
  </div>
);

export default BuybackableEquipmentTab;
