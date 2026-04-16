/**
 * ContractStockManager
 *
 * Gestion du stock pour un contrat :
 *  - Tab "Stock actif" : matériel actuellement attribué (swap / retour / rachat / rebut)
 *  - Tab "Fin de contrat" : listing retour + suivi des rachetés / retournés / mis au rebut
 *    → disponible dès que le contrat est terminé ou se termine dans ≤ 30 jours
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Warehouse,
  ArrowRightLeft,
  Package,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Euro,
  Trash2,
  ClipboardList,
  Calendar,
} from "lucide-react";
import {
  StockItem,
  StockMovement,
  fetchStockItemsByContract,
  fetchContractEndMovements,
  STOCK_STATUS_CONFIG,
  CONDITION_CONFIG,
} from "@/services/stockService";
import SwapDialog from "./SwapDialog";
import EndOfContractActions from "./EndOfContractActions";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

// ── helpers ───────────────────────────────────────────────────────────────────

function addMonthsToDate(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function computeContractEndDate(
  contract: ContractInfo | undefined
): Date | null {
  if (!contract) return null;
  if (contract.contract_end_date) return new Date(contract.contract_end_date);
  const duration = contract.contract_duration || contract.lease_duration;
  if (contract.contract_start_date && duration) {
    return addMonthsToDate(new Date(contract.contract_start_date), duration);
  }
  if (contract.delivery_date && duration) {
    return addMonthsToDate(new Date(contract.delivery_date), duration);
  }
  return null;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface ContractInfo {
  status?: string;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  contract_duration?: number | null;
  lease_duration?: number | null;
  delivery_date?: string | null;
}

interface ContractStockManagerProps {
  contractId: string;
  companyId: string;
  contract?: ContractInfo;
  onUpdate: () => void;
}

// ── sub-component: MovementRow ────────────────────────────────────────────────

const MOVEMENT_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  unassign_contract: {
    label: "Retourné en stock",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    color: "text-blue-700",
  },
  rachat_client: {
    label: "Racheté par le client",
    icon: <Euro className="h-3.5 w-3.5" />,
    color: "text-emerald-700",
  },
  sell: {
    label: "Vendu",
    icon: <Euro className="h-3.5 w-3.5" />,
    color: "text-emerald-700",
  },
  scrap: {
    label: "Mis au rebut",
    icon: <Trash2 className="h-3.5 w-3.5" />,
    color: "text-red-700",
  },
};

const MovementRow: React.FC<{ movement: StockMovement }> = ({ movement }) => {
  const cfg = MOVEMENT_LABEL[movement.movement_type] ?? {
    label: movement.movement_type,
    icon: null,
    color: "text-muted-foreground",
  };
  const itemTitle = (movement.stock_item as any)?.title ?? "—";
  const serial = (movement.stock_item as any)?.serial_number;
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cfg.color}>{cfg.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{itemTitle}</p>
          {serial && (
            <p className="text-xs text-muted-foreground font-mono">S/N: {serial}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 ml-3 shrink-0">
        <Badge
          variant="outline"
          className={`text-[11px] ${cfg.color} border-current`}
        >
          {cfg.label}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {format(new Date(movement.created_at), "dd MMM yy", { locale: fr })}
        </span>
      </div>
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────

const ContractStockManager: React.FC<ContractStockManagerProps> = ({
  contractId,
  companyId,
  contract,
  onUpdate,
}) => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [endMovements, setEndMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapItem, setSwapItem] = useState<StockItem | null>(null);

  // ── compute end date + days remaining ──────────────────────────────────────
  const endDate = computeContractEndDate(contract);
  const daysUntilEnd = endDate ? differenceInDays(endDate, new Date()) : null;
  const isCompleted = contract?.status === "completed";
  const isEndingSoon =
    daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30;
  const isOverdue = daysUntilEnd !== null && daysUntilEnd < 0 && !isCompleted;

  const showFinTab = isCompleted || isEndingSoon || isOverdue;
  const defaultTab = showFinTab ? "fin" : "actif";

  // ── data loading ───────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [stockData, movementData] = await Promise.all([
        fetchStockItemsByContract(contractId),
        fetchContractEndMovements(contractId),
      ]);
      setItems(stockData);
      setEndMovements(movementData);
    } catch (e) {
      console.error("Erreur chargement stock contrat:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [contractId]);

  const handleRefresh = () => {
    loadData();
    onUpdate();
  };

  // ── group movements by type for the fin tab ────────────────────────────────
  const returned = endMovements.filter((m) => m.movement_type === "unassign_contract");
  const rachetes = endMovements.filter((m) => m.movement_type === "rachat_client");
  const vendu = endMovements.filter((m) => m.movement_type === "sell");
  const rebut = endMovements.filter((m) => m.movement_type === "scrap");

  const assignedItems = items.filter((i) => i.status === "assigned");
  const pendingCount = assignedItems.length;
  const processedCount = endMovements.length;

  // ── end date banner ────────────────────────────────────────────────────────
  const renderEndBanner = () => {
    if (!endDate) return null;

    if (isCompleted) {
      return (
        <Alert className="border-slate-200 bg-slate-50 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
          <AlertDescription className="text-xs text-slate-700 ml-1">
            Contrat terminé le{" "}
            <strong>{format(endDate, "dd MMMM yyyy", { locale: fr })}</strong>
          </AlertDescription>
        </Alert>
      );
    }

    if (isOverdue) {
      return (
        <Alert className="border-red-200 bg-red-50 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
          <AlertDescription className="text-xs text-red-700 ml-1">
            Contrat expiré depuis le{" "}
            <strong>{format(endDate, "dd MMMM yyyy", { locale: fr })}</strong> (
            {Math.abs(daysUntilEnd!)} jour{Math.abs(daysUntilEnd!) > 1 ? "s" : ""})
          </AlertDescription>
        </Alert>
      );
    }

    if (isEndingSoon) {
      return (
        <Alert className="border-amber-200 bg-amber-50 py-2">
          <Calendar className="h-3.5 w-3.5 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800 ml-1">
            Ce contrat se termine le{" "}
            <strong>{format(endDate, "dd MMMM yyyy", { locale: fr })}</strong>{" "}
            —{" "}
            <strong>
              {daysUntilEnd} jour{daysUntilEnd! > 1 ? "s" : ""}
            </strong>{" "}
            restant{daysUntilEnd! > 1 ? "s" : ""}. Préparez le retour du matériel.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Warehouse className="h-5 w-5" />
            Gestion du stock
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue={defaultTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="actif" className="flex-1 text-xs gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Stock actif
                  {items.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {items.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="fin" className="flex-1 text-xs gap-1.5 relative">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Fin de contrat
                  {pendingCount > 0 && showFinTab && (
                    <Badge
                      className={`text-[10px] px-1.5 py-0 h-4 ${
                        isCompleted || isOverdue
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {pendingCount} à traiter
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Tab: Stock actif ─────────────────────────────────────── */}
              <TabsContent value="actif" className="mt-0">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Aucun article de stock lié à ce contrat</p>
                    <p className="text-xs mt-1 opacity-70">
                      Les articles apparaîtront ici après ajout depuis les commandes fournisseurs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => {
                      const statusCfg = STOCK_STATUS_CONFIG[item.status];
                      const condCfg = CONDITION_CONFIG[item.condition];
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {item.serial_number && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  S/N: {item.serial_number}
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-xs ${statusCfg?.bgColor || ""} ${statusCfg?.color || ""}`}
                              >
                                {statusCfg?.label || item.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {condCfg?.label || item.condition}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            {item.status === "assigned" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setSwapItem(item)}
                                  title="Échanger"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                </Button>
                                <EndOfContractActions
                                  item={item}
                                  companyId={companyId}
                                  contractId={contractId}
                                  onSuccess={handleRefresh}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ── Tab: Fin de contrat ──────────────────────────────────── */}
              <TabsContent value="fin" className="mt-0 space-y-4">
                {renderEndBanner()}

                {/* Matériel à traiter */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Matériel à traiter
                    </h4>
                    {pendingCount > 0 ? (
                      <Badge className="bg-amber-100 text-amber-700 text-[11px]">
                        {pendingCount} article{pendingCount > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[11px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Tout traité
                      </Badge>
                    )}
                  </div>

                  {assignedItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-3 bg-muted/30 rounded-lg">
                      Aucun article en attente de décision.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {assignedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border border-amber-200 bg-amber-50/50 rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            {item.serial_number && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                S/N: {item.serial_number}
                              </p>
                            )}
                          </div>
                          <div className="ml-3 flex items-center gap-1">
                            <EndOfContractActions
                              item={item}
                              companyId={companyId}
                              contractId={contractId}
                              onSuccess={handleRefresh}
                            />
                          </div>
                        </div>
                      ))}
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <RotateCcw className="h-3 w-3" /> Retour stock &nbsp;·&nbsp;
                        <Euro className="h-3 w-3 text-emerald-600" /> Rachat client &nbsp;·&nbsp;
                        <Trash2 className="h-3 w-3 text-red-500" /> Rebut
                      </p>
                    </div>
                  )}
                </div>

                {/* Matériel traité */}
                {processedCount > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Matériel traité
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({processedCount})
                        </span>
                      </h4>

                      <div className="space-y-1.5">
                        {/* Racheté */}
                        {rachetes.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              Rachetés par le client ({rachetes.length})
                            </p>
                            {rachetes.map((m) => (
                              <MovementRow key={m.id} movement={m} />
                            ))}
                          </div>
                        )}

                        {/* Retourné */}
                        {returned.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" />
                              Retournés en stock ({returned.length})
                            </p>
                            {returned.map((m) => (
                              <MovementRow key={m.id} movement={m} />
                            ))}
                          </div>
                        )}

                        {/* Vendu (hors rachat) */}
                        {vendu.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              Vendus ({vendu.length})
                            </p>
                            {vendu.map((m) => (
                              <MovementRow key={m.id} movement={m} />
                            ))}
                          </div>
                        )}

                        {/* Rebut */}
                        {rebut.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-red-700 flex items-center gap-1">
                              <Trash2 className="h-3 w-3" />
                              Mis au rebut ({rebut.length})
                            </p>
                            {rebut.map((m) => (
                              <MovementRow key={m.id} movement={m} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Aucun mouvement tracé */}
                {processedCount === 0 && pendingCount === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucun article de stock enregistré pour ce contrat.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {swapItem && (
        <SwapDialog
          open={!!swapItem}
          onOpenChange={(open) => !open && setSwapItem(null)}
          currentItem={swapItem}
          contractId={contractId}
          companyId={companyId}
          onSuccess={handleRefresh}
        />
      )}
    </>
  );
};

export default ContractStockManager;
