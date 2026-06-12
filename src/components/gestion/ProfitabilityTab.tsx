import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, TrendingUp, TrendingDown, AlertTriangle, ArrowUpDown } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import {
  ContractProfitability,
  ProfitabilitySummary,
  getContractProfitability,
} from "@/services/profitabilityService";

const fmtEur = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtEurFull = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  completed: "Terminé",
  defaulted: "Défaut",
  cancelled: "Annulé",
  contract_sent: "Envoyé",
  equipment_ordered: "Commandé",
};

type SortKey = "margin_real" | "margin_pct" | "revenue_invoiced" | "created_at";

const ProfitabilityTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [data, setData] = useState<ProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("relevant");
  const [sortKey, setSortKey] = useState<SortKey>("margin_real");
  const [sortAsc, setSortAsc] = useState(true);
  const [detail, setDetail] = useState<ContractProfitability | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    getContractProfitability(companyId)
      .then(setData)
      .catch((e) => console.error("Erreur rentabilité:", e))
      .finally(() => setLoading(false));
  }, [companyId]);

  const rows = useMemo(() => {
    if (!data) return [];
    let r = data.contracts;
    if (statusFilter === "relevant") r = r.filter((c) => !["cancelled"].includes(c.status));
    else if (statusFilter !== "all") r = r.filter((c) => c.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((c) =>
        `${c.contract_number || ""} ${c.client_name || ""} ${c.leaser_name || ""}`.toLowerCase().includes(s),
      );
    }
    // n'afficher que les contrats avec du CA ou des coûts (sinon bruit)
    r = r.filter((c) => c.revenue_invoiced !== 0 || c.cost_total !== 0);
    const dir = sortAsc ? 1 : -1;
    return [...r].sort((a, b) => {
      const va = (a as any)[sortKey] ?? -Infinity;
      const vb = (b as any)[sortKey] ?? -Infinity;
      return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
    });
  }, [data, statusFilter, search, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(k === "margin_real" || k === "margin_pct"); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Calcul de la rentabilité...</div>;
  if (!data) return null;

  const t = data.totals;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">CA facturé (HTVA)</div>
          <div className="text-xl font-bold">{fmtEur(t.revenue)}</div>
          <div className="text-xs text-muted-foreground">{t.contract_count} contrat(s)</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Coûts matériel + commissions</div>
          <div className="text-xl font-bold">{fmtEur(t.cost)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Marge réelle</div>
          <div className={`text-xl font-bold ${t.margin >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtEur(t.margin)}</div>
          <div className="text-xs text-muted-foreground">{t.margin_pct != null ? `${t.margin_pct.toFixed(1)} % du CA` : "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Marges négatives</div>
          <div className={`text-xl font-bold ${t.negative_count ? "text-red-600" : ""}`}>{t.negative_count}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Coûts estimés</div>
          <div className="text-xl font-bold">{t.estimated_count}</div>
          <div className="text-xs text-muted-foreground">à affiner via le matching achats</div>
        </CardContent></Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Contrat, client, bailleur..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="relevant">Hors annulés</SelectItem>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="completed">Terminés</SelectItem>
            <SelectItem value="defaulted">En défaut</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">{rows.length} contrat(s)</div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrat</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Bailleur</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("revenue_invoiced")}>
                  CA facturé <ArrowUpDown className="inline h-3 w-3" />
                </TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("margin_real")}>
                  Marge € <ArrowUpDown className="inline h-3 w-3" />
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("margin_pct")}>
                  Marge % <ArrowUpDown className="inline h-3 w-3" />
                </TableHead>
                <TableHead className="text-right">Théorique</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const neg = c.revenue_invoiced > 0 && c.margin_real < 0;
                return (
                  <TableRow key={c.contract_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetail(c)}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {c.contract_number || "—"}
                      {c.is_self_leasing && <Badge variant="outline" className="ml-1 text-xs">self</Badge>}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{c.client_name || "—"}</TableCell>
                    <TableCell className="max-w-[110px] truncate text-xs text-muted-foreground">{c.leaser_name || "—"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {fmtEur(c.revenue_invoiced + c.dossier_fee)}
                      {c.is_self_leasing && c.revenue_projected > 0 && (
                        <div className="text-xs text-muted-foreground">proj. {fmtEur(c.revenue_projected)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {fmtEur(c.cost_total)}
                      {c.cost_estimated ? (
                        <Badge variant="outline" className="ml-1 text-xs text-amber-600 border-amber-300">est.</Badge>
                      ) : c.equipment_count > 0 ? (
                        <Badge variant="outline" className="ml-1 text-xs text-green-600 border-green-300">réel</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className={`text-right font-medium whitespace-nowrap ${neg ? "text-red-600" : c.margin_real > 0 ? "text-green-600" : ""}`}>
                      {fmtEur(c.margin_real)}
                    </TableCell>
                    <TableCell className={`text-right whitespace-nowrap ${neg ? "text-red-600" : ""}`}>
                      {c.margin_pct != null ? `${c.margin_pct.toFixed(1)} %` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {c.margin_theoretical != null ? fmtEur(c.margin_theoretical) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "defaulted" ? "destructive" : "secondary"} className="text-xs">
                        {STATUS_LABELS[c.status] || c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Aucun contrat avec CA ou coûts.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Drill-down */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.contract_number || "Contrat"} — {detail?.client_name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-4 pr-3 text-sm">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs text-muted-foreground">CA facturé</div>
                    <div className="font-bold">{fmtEurFull(detail.revenue_invoiced + detail.dossier_fee)}</div>
                    {detail.credit_notes_total > 0 && <div className="text-xs text-purple-600">dont NC −{fmtEurFull(detail.credit_notes_total)}</div>}
                    {detail.dossier_fee > 0 && <div className="text-xs text-muted-foreground">dont frais dossier {fmtEurFull(detail.dossier_fee)}</div>}
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs text-muted-foreground">Coût matériel</div>
                    <div className="font-bold">{fmtEurFull(detail.cost_total)}</div>
                    <div className="text-xs text-muted-foreground">{detail.equipment_confirmed}/{detail.equipment_count} prix réels</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs text-muted-foreground">Marge réelle</div>
                    <div className={`font-bold ${detail.margin_real >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtEurFull(detail.margin_real)}</div>
                    {detail.margin_theoretical != null && (
                      <div className="text-xs text-muted-foreground">théorique {fmtEurFull(detail.margin_theoretical)}</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-medium mb-2">Équipements</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead className="text-center">Qté</TableHead>
                        <TableHead className="text-right">Prix prévu</TableHead>
                        <TableHead className="text-right">Prix réel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.equipment.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[260px] truncate text-xs">{e.title}</TableCell>
                          <TableCell className="text-center text-xs">{e.quantity}</TableCell>
                          <TableCell className="text-right text-xs">{fmtEurFull(e.purchase_price)}</TableCell>
                          <TableCell className="text-right text-xs">
                            {e.actual_purchase_price != null ? (
                              <span className="text-green-600 font-medium">{fmtEurFull(e.actual_purchase_price)}</span>
                            ) : (
                              <span className="text-amber-600">non confirmé</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <div className="font-medium mb-2">Factures ({detail.invoice_count})</div>
                  {detail.invoices.map((i, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b last:border-0 text-xs">
                      <span className="font-mono">{i.invoice_number || "—"} <span className="text-muted-foreground">({i.invoice_date?.slice(0, 10) || "—"})</span></span>
                      <span>{fmtEurFull(i.amount)} <Badge variant="outline" className="ml-1 text-xs">{i.status}</Badge></span>
                    </div>
                  ))}
                  {!detail.invoices.length && <div className="text-xs text-muted-foreground">Aucune facture liée.</div>}
                </div>

                {detail.is_self_leasing && (
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                    Self-leasing : {fmtEurFull(detail.monthly_payment)}/mois × {detail.contract_duration || "?"} mois
                    → revenu projeté {fmtEurFull(detail.revenue_projected)}. La marge affichée est basée sur le facturé à date.
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfitabilityTab;
