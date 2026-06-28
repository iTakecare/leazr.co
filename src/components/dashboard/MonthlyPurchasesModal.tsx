import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateEquipmentUnit, updateContractEquipmentOrder } from "@/services/equipmentOrderService";

interface PurchaseDetailRow {
  source: string;
  equipment_title: string;
  client_name: string | null;
  reference: string | null;
  supplier_name: string | null;
  quantity: number;
  cost: number;
  purchase_date: string | null;
  kind: "unit" | "contract" | "offer";
  record_id: string;
}

interface MonthlyPurchasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number | null; // 1-12
  monthLabel: string;
  onChanged?: () => void; // pour rafraîchir le dashboard après édition d'une date
}

const sourceBadge = (source: string) => {
  if (source === "Vente directe") return "bg-green-100 text-green-700 border-green-200";
  if (source === "Leasing (unité)") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

// purchase_date (ISO ou yyyy-mm-dd) → yyyy-mm-dd pour <input type="date">
const toInputDate = (d: string | null): string => (d ? d.slice(0, 10) : "");

const MonthlyPurchasesModal: React.FC<MonthlyPurchasesModalProps> = ({
  open,
  onOpenChange,
  year,
  month,
  monthLabel,
  onChanged,
}) => {
  const [rows, setRows] = useState<PurchaseDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const fetchRows = React.useCallback(() => {
    if (!month) return;
    setLoading(true);
    supabase
      .rpc("get_monthly_purchases_detail", { p_year: year, p_month: month })
      .then(({ data, error }) => {
        if (error) {
          console.error("[MonthlyPurchasesModal] RPC error:", error);
          setRows([]);
        } else {
          setRows((data as PurchaseDetailRow[]) || []);
        }
        setEdits({});
        setLoading(false);
      });
  }, [year, month]);

  useEffect(() => {
    if (open && month) fetchRows();
  }, [open, month, fetchRows]);

  const handleSaveDate = async (row: PurchaseDetailRow, idx: number) => {
    const newDate = edits[idx];
    if (!newDate) return;
    const iso = new Date(newDate + "T12:00:00").toISOString();
    try {
      setSavingIdx(idx);
      if (row.kind === "unit") {
        await updateEquipmentUnit(row.record_id, { order_date: iso } as any);
      } else if (row.kind === "contract") {
        // order_date pilote le mois ; updateContractEquipmentOrder synchronise actual_purchase_date
        await updateContractEquipmentOrder(row.record_id, { order_date: iso });
      }
      toast.success("Date d'achat mise à jour");
      onChanged?.();
      fetchRows(); // la ligne sortira du mois si la date change de mois
    } catch (e) {
      console.error("[MonthlyPurchasesModal] save error:", e);
      toast.error("Erreur lors de la mise à jour de la date");
    } finally {
      setSavingIdx(null);
    }
  };

  const total = rows.reduce((sum, r) => sum + Number(r.cost || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Détail des achats — {monthLabel} {year}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Chargement…"
              : `${rows.length} ligne${rows.length > 1 ? "s" : ""} • Total ${formatCurrency(total)} — modifiez la date d'achat pour reclasser un équipement dans le bon mois.`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucun achat sur ce mois.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Équipement</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead>Date d'achat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const editable = r.kind === "unit" || r.kind === "contract";
                  const currentVal = edits[i] ?? toInputDate(r.purchase_date);
                  const dirty = edits[i] !== undefined && edits[i] !== toInputDate(r.purchase_date);
                  return (
                    <TableRow key={`${r.kind}-${r.record_id}-${i}`}>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${sourceBadge(r.source)}`}>
                          {r.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={r.equipment_title}>
                        {r.equipment_title}
                      </TableCell>
                      <TableCell>{r.client_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.reference || "—"}</TableCell>
                      <TableCell className="text-sm">{r.supplier_name || "—"}</TableCell>
                      <TableCell className="text-right">{Number(r.quantity)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(r.cost))}</TableCell>
                      <TableCell>
                        {editable ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="date"
                              value={currentVal}
                              onChange={(e) => setEdits((p) => ({ ...p, [i]: e.target.value }))}
                              className="h-8 w-36 text-xs"
                            />
                            <Button
                              size="icon"
                              variant={dirty ? "default" : "ghost"}
                              className="h-8 w-8 shrink-0"
                              disabled={!dirty || savingIdx === i}
                              onClick={() => handleSaveDate(r, i)}
                              title="Enregistrer la date"
                            >
                              {savingIdx === i ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground" title="Date de la facture d'achat (non modifiable ici)">
                            {toInputDate(r.purchase_date) || "—"} <span className="text-xs">(facture)</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-slate-100 dark:bg-slate-800/50 border-t-2 font-medium">
                  <TableCell colSpan={6}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyPurchasesModal;
