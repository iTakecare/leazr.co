/**
 * StockItemSelectorList
 *
 * Liste cliquable du matériel disponible en stock pour ajout à une offre.
 * - Filtres: recherche texte, origine (achat / reprise), état
 * - Affiche un badge "Reprise contrat — XX €" pour le matériel racheté
 */
import React, { useState, useMemo } from "react";
import {
  fetchAvailableStockItems,
  StockItem,
  StockSource,
  StockCondition,
  STOCK_SOURCE_CONFIG,
  CONDITION_CONFIG,
} from "@/services/stockService";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StockItemSelectorListProps {
  companyId: string;
  onSelectStockItem: (item: StockItem) => void;
}

const StockItemSelectorList: React.FC<StockItemSelectorListProps> = ({
  companyId,
  onSelectStockItem,
}) => {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StockSource | "all">("all");
  const [conditionFilter, setConditionFilter] = useState<StockCondition | "all">("all");

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["available-stock-items", companyId],
    queryFn: () => fetchAvailableStockItems(companyId),
    enabled: !!companyId,
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (sourceFilter !== "all" && (item.source || "purchase") !== sourceFilter) {
        return false;
      }
      if (conditionFilter !== "all" && item.condition !== conditionFilter) {
        return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(s) ||
          (item.serial_number || "").toLowerCase().includes(s) ||
          (item.brand || "").toLowerCase().includes(s) ||
          (item.model || "").toLowerCase().includes(s);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, search, sourceFilter, conditionFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b space-y-2 bg-muted/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher (titre, S/N, marque, modèle)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Origine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes origines</SelectItem>
              {Object.entries(STOCK_SOURCE_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={(v) => setConditionFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="État" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous états</SelectItem>
              {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-sm text-destructive px-4">
            Erreur de chargement du stock.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground px-4">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {items.length === 0
              ? "Aucun matériel disponible en stock."
              : "Aucun résultat pour ces filtres."}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((item) => {
              const sourceCfg =
                item.source === "contract_buyback"
                  ? STOCK_SOURCE_CONFIG.contract_buyback
                  : null;
              const condCfg = CONDITION_CONFIG[item.condition];
              const displayPrice =
                item.unit_price ?? item.buyback_price ?? item.purchase_price ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectStockItem(item)}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.serial_number && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            S/N: {item.serial_number}
                          </span>
                        )}
                        {condCfg && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {condCfg.label}
                          </Badge>
                        )}
                        {sourceCfg && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-normal ${sourceCfg.bgColor} ${sourceCfg.color}`}
                            title={
                              item.buyback_price
                                ? `Rachat: ${item.buyback_price.toFixed(2)} €`
                                : sourceCfg.label
                            }
                          >
                            {sourceCfg.label}
                            {item.buyback_price !== null && item.buyback_price !== undefined
                              ? ` — ${item.buyback_price.toFixed(2)} €`
                              : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">
                        {displayPrice.toFixed(2)} €
                      </p>
                      <p className="text-[10px] text-muted-foreground">prix achat</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockItemSelectorList;
