/**
 * StockItemCostsSection
 *
 * Liste les coûts additionnels d'un stock_item (réparation, pièce détachée,
 * amélioration, logistique, autre) et permet d'en ajouter / supprimer.
 *
 * Affiche en bas le total: prix d'achat + Σ coûts = coût réel.
 */
import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plus,
  Trash2,
  Loader2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchStockItemCosts,
  createStockItemCost,
  deleteStockItemCost,
  computeAdditionalCostsTotal,
  StockItemCost,
  StockCostCategory,
  STOCK_COST_CATEGORY_CONFIG,
} from "@/services/stockService";
import { useAuth } from "@/context/AuthContext";

interface StockItemCostsSectionProps {
  stockItemId: string;
  companyId: string;
  purchasePrice: number;
  onTotalChange?: (realCost: number) => void;
}

const StockItemCostsSection: React.FC<StockItemCostsSectionProps> = ({
  stockItemId,
  companyId,
  purchasePrice,
  onTotalChange,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["stock-item-costs", stockItemId];
  const { data: costs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchStockItemCosts(stockItemId),
    enabled: !!stockItemId,
  });

  const total = computeAdditionalCostsTotal(costs);
  const realCost = (purchasePrice || 0) + total;

  React.useEffect(() => {
    onTotalChange?.(realCost);
  }, [realCost, onTotalChange]);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{
    label: string;
    amount: string;
    category: StockCostCategory;
    cost_date: string;
    notes: string;
  }>({
    label: "",
    amount: "",
    category: "repair",
    cost_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [deleteCost, setDeleteCost] = useState<StockItemCost | null>(null);

  const addMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount.replace(",", "."));
      if (!form.label.trim()) throw new Error("Le libellé est requis");
      if (isNaN(amount) || amount < 0) throw new Error("Montant invalide");
      return createStockItemCost({
        company_id: companyId,
        stock_item_id: stockItemId,
        label: form.label.trim(),
        amount,
        category: form.category,
        cost_date: form.cost_date,
        notes: form.notes.trim() || null,
        created_by: user?.id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setForm((f) => ({ ...f, label: "", amount: "", notes: "" }));
      setAdding(false);
      toast.success("Coût ajouté");
    },
    onError: (e: any) => toast.error(e.message || "Erreur ajout coût"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteStockItemCost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteCost(null);
      toast.success("Coût supprimé");
    },
    onError: (e: any) => toast.error(e.message || "Erreur suppression"),
  });

  return (
    <div className="col-span-2 border-t pt-3 mt-1">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Coûts additionnels
        </Label>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter un coût
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : costs.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground py-2 px-3 bg-muted/30 rounded">
          Aucun coût additionnel. Ajoutez réparations, pièces, améliorations…
        </p>
      ) : (
        <div className="space-y-1.5">
          {costs.map((cost) => {
            const cfg = STOCK_COST_CATEGORY_CONFIG[cost.category];
            return (
              <div
                key={cost.id}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 border border-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {cost.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-normal ${cfg.bgColor} ${cfg.color}`}
                    >
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span>
                      {format(new Date(cost.cost_date), "dd MMM yyyy", { locale: fr })}
                    </span>
                    {cost.notes && (
                      <>
                        <span>·</span>
                        <span className="truncate">{cost.notes}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-sm font-semibold">
                    {Number(cost.amount).toFixed(2)} €
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteCost(cost)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <div className="mt-2 p-3 border rounded-md bg-accent/30 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Libellé *</Label>
              <Input
                placeholder="Ex: Changement clavier AZERTY"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Montant (€) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 45.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Catégorie</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as StockCostCategory }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STOCK_COST_CATEGORY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={form.cost_date}
                onChange={(e) => setForm((f) => ({ ...f, cost_date: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes (optionnel)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdding(false)}
              disabled={addMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !form.label || !form.amount}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Ajout…
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Total summary */}
      {(costs.length > 0 || total > 0) && (
        <div className="mt-3 flex items-center justify-between text-sm bg-muted/20 px-3 py-2 rounded-md border">
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <div>Prix d'achat: {(purchasePrice || 0).toFixed(2)} €</div>
            <div>Coûts additionnels: +{total.toFixed(2)} €</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Coût d'achat réel</div>
            <div className="text-base font-semibold">{realCost.toFixed(2)} €</div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteCost} onOpenChange={(o) => !o && setDeleteCost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce coût ?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteCost?.label}" ({deleteCost ? Number(deleteCost.amount).toFixed(2) : "0.00"} €) sera supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCost && deleteMutation.mutate(deleteCost.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockItemCostsSection;
