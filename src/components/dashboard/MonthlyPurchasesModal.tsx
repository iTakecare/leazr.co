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
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PurchaseDetailRow {
  source: string;
  equipment_title: string;
  client_name: string | null;
  reference: string | null;
  supplier_name: string | null;
  quantity: number;
  cost: number;
  purchase_date: string | null;
}

interface MonthlyPurchasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number | null; // 1-12
  monthLabel: string;
}

const sourceBadge = (source: string) => {
  if (source === "Vente directe") return "bg-green-100 text-green-700 border-green-200";
  if (source === "Leasing (unité)") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

const MonthlyPurchasesModal: React.FC<MonthlyPurchasesModalProps> = ({
  open,
  onOpenChange,
  year,
  month,
  monthLabel,
}) => {
  const [rows, setRows] = useState<PurchaseDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !month) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc("get_monthly_purchases_detail", { p_year: year, p_month: month })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[MonthlyPurchasesModal] RPC error:", error);
          setRows([]);
        } else {
          setRows((data as PurchaseDetailRow[]) || []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, month, year]);

  const total = rows.reduce((sum, r) => sum + Number(r.cost || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Détail des achats — {monthLabel} {year}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Chargement…"
              : `${rows.length} ligne${rows.length > 1 ? "s" : ""} • Total ${formatCurrency(total)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun achat sur ce mois.
            </div>
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
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {r.purchase_date
                        ? format(new Date(r.purchase_date), "dd MMM yyyy", { locale: fr })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
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
