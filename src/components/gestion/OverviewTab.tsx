import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, Search, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { getSalesOverview, SalesInvoiceDetail } from "@/services/gestionService";
import { getSupplierInvoices, SupplierInvoice } from "@/services/supplierInvoiceService";

const fmtEur = (n: number) => (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtEurFull = (n: number) => (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
const MONTH_LABELS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
const CAT_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e", "#64748b"];
const monthLabel = (ym: string) => `${MONTH_LABELS[parseInt(ym.slice(5), 10) - 1] || ym}`;

interface Props { fromDate: string; costCenterId?: string | null }

const OverviewTab: React.FC<Props> = ({ fromDate, costCenterId }) => {
  const { companyId } = useMultiTenant();
  const [sales, setSales] = useState<SalesInvoiceDetail[]>([]);
  const [purchases, setPurchases] = useState<SupplierInvoice[]>([]);
  const [revByMonth, setRevByMonth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchRev, setSearchRev] = useState("");
  const [searchExp, setSearchExp] = useState("");
  const [salesDetail, setSalesDetail] = useState<SalesInvoiceDetail | null>(null);
  const [purchaseDetail, setPurchaseDetail] = useState<SupplierInvoice | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    Promise.all([getSalesOverview(companyId, fromDate, costCenterId), getSupplierInvoices(companyId, fromDate, costCenterId)])
      .then(([ov, pur]) => {
        setSales(ov.revenues.invoices);
        setRevByMonth(ov.revenues.byMonth);
        setPurchases(pur);
      })
      .catch((e) => console.error("Erreur overview:", e))
      .finally(() => setLoading(false));
  }, [companyId, fromDate, costCenterId]);

  const totals = useMemo(() => {
    const rev = sales.reduce((s, i) => s + i.amount, 0);
    const sign = (p: SupplierInvoice) => (p.doc_type === "credit_note" ? -1 : 1);
    const exp = purchases.reduce((s, p) => s + (p.amount_excl || 0) * sign(p), 0);
    return { rev, exp, margin: rev - exp, marginPct: rev > 0 ? ((rev - exp) / rev) * 100 : null };
  }, [sales, purchases]);

  const chartData = useMemo(() => {
    const expByMonth: Record<string, number> = {};
    for (const p of purchases) {
      const m = (p.invoice_date || "").slice(0, 7);
      if (m) expByMonth[m] = (expByMonth[m] || 0) + (p.amount_excl || 0) * (p.doc_type === "credit_note" ? -1 : 1);
    }
    const months = Array.from(new Set([...Object.keys(revByMonth), ...Object.keys(expByMonth)])).sort();
    return months.map((m) => ({
      mois: monthLabel(m),
      Revenus: Math.round(revByMonth[m] || 0),
      Dépenses: Math.round(expByMonth[m] || 0),
    }));
  }, [revByMonth, purchases]);

  const filteredSales = useMemo(() => {
    const s = searchRev.toLowerCase();
    return sales.filter((i) => !s || `${i.invoice_number} ${i.client_name} ${i.leaser_name}`.toLowerCase().includes(s));
  }, [sales, searchRev]);

  const filteredPurchases = useMemo(() => {
    const s = searchExp.toLowerCase();
    return purchases.filter((p) => !s || `${p.invoice_number} ${p.supplier_name} ${p.category}`.toLowerCase().includes(s));
  }, [purchases, searchExp]);

  const tickByMonth = useMemo(() => Object.fromEntries(chartData.map((d) => [d.mois, d])), [chartData]);

  const { catBreakdown, topSuppliers } = useMemo(() => {
    const byCat: Record<string, number> = {};
    const bySupp: Record<string, number> = {};
    for (const p of purchases) {
      const amt = (p.amount_excl || 0) * (p.doc_type === "credit_note" ? -1 : 1);
      byCat[p.category || "Non catégorisé"] = (byCat[p.category || "Non catégorisé"] || 0) + amt;
      if (p.supplier_name) bySupp[p.supplier_name] = (bySupp[p.supplier_name] || 0) + amt;
    }
    return {
      catBreakdown: Object.entries(byCat).sort((a, b) => b[1] - a[1]),
      topSuppliers: Object.entries(bySupp).sort((a, b) => b[1] - a[1]).slice(0, 10),
    };
  }, [purchases]);

  const kEur = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`);
  // Tick personnalisé : mois + revenus (vert) / dépenses (rouge) / marge sous chaque barre
  const renderMonthTick = (props: any) => {
    const { x, y, payload } = props;
    const d = tickByMonth[payload.value];
    if (!d) return null;
    const marge = (d.Revenus || 0) - (d.Dépenses || 0);
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={14} textAnchor="middle" fontSize={11} fontWeight={600} fill="currentColor">{payload.value}</text>
        <text x={0} y={0} dy={28} textAnchor="middle" fontSize={9} fill="#16a34a">{kEur(d.Revenus)}€</text>
        <text x={0} y={0} dy={40} textAnchor="middle" fontSize={9} fill="#ef4444">{kEur(d.Dépenses)}€</text>
        <text x={0} y={0} dy={52} textAnchor="middle" fontSize={9} fontWeight={700} fill={marge >= 0 ? "#059669" : "#e11d48"}>{marge >= 0 ? "+" : ""}{kEur(marge)}€</text>
      </g>
    );
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement de la vue d'ensemble...</div>;

  return (
    <div className="space-y-4">
      {/* KPIs colorés */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><ArrowDownToLine className="h-5 w-5 text-green-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Revenus (CA HTVA)</div>
              <div className="text-2xl font-bold text-green-600">{fmtEur(totals.rev)}</div>
              <div className="text-xs text-muted-foreground">{sales.length} facture(s) de vente</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><ArrowUpFromLine className="h-5 w-5 text-red-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Dépenses (HTVA)</div>
              <div className="text-2xl font-bold text-red-600">{fmtEur(totals.exp)}</div>
              <div className="text-xs text-muted-foreground">{purchases.length} facture(s) d'achat</div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${totals.margin >= 0 ? "border-l-emerald-500" : "border-l-rose-500"}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totals.margin >= 0 ? "bg-emerald-100" : "bg-rose-100"}`}>
              {totals.margin >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-rose-600" />}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Marge brute</div>
              <div className={`text-2xl font-bold ${totals.margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtEur(totals.margin)}</div>
              <div className="text-xs text-muted-foreground">{totals.marginPct != null ? `${totals.marginPct.toFixed(1)} % du CA` : "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphe comparatif mensuel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Revenus vs Dépenses par mois</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} margin={{ bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mois" tick={renderMonthTick} height={60} interval={0} />
                <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => fmtEurFull(v)} />
                <Legend verticalAlign="top" />
                <Bar dataKey="Revenus" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center">
            Sous chaque mois : <span className="text-green-600 font-medium">revenus</span> / <span className="text-red-600 font-medium">dépenses</span> / <span className="font-medium">marge</span>
          </div>
        </CardContent>
      </Card>

      {/* Deux colonnes : Revenus | Dépenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenus */}
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <ArrowDownToLine className="h-4 w-4" /> Revenus — factures de vente
            </CardTitle>
            <CardDescription>Cliquez une facture pour voir le détail</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Client, n°..." className="pl-10 h-9" value={searchRev} onChange={(e) => setSearchRev(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">HTVA</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((i) => (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-green-50/60" onClick={() => setSalesDetail(i)}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{i.invoice_number}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{i.client_name || i.leaser_name || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{i.invoice_date?.slice(0, 10) || "—"}</TableCell>
                      <TableCell className="text-right font-medium text-green-700 whitespace-nowrap">{fmtEur(i.amount)}</TableCell>
                      <TableCell>
                        <Badge className={i.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                          {i.status === "paid" ? "payée" : i.status === "sent" ? "envoyée" : i.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dépenses */}
        <Card className="border-t-4 border-t-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <ArrowUpFromLine className="h-4 w-4" /> Dépenses — factures d'achat
            </CardTitle>
            <CardDescription>Cliquez une facture pour voir le détail</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Fournisseur, catégorie..." className="pl-10 h-9" value={searchExp} onChange={(e) => setSearchExp(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">HTVA</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-red-50/60" onClick={() => setPurchaseDetail(p)}>
                      <TableCell className="max-w-[140px] truncate">{p.supplier_name || p.invoice_number}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">{p.category || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{p.invoice_date?.slice(0, 10) || "—"}</TableCell>
                      <TableCell className="text-right font-medium text-red-700 whitespace-nowrap">{fmtEur(p.amount_excl * (p.doc_type === "credit_note" ? -1 : 1))}</TableCell>
                      <TableCell>
                        {p.paid ? <Badge className="bg-green-100 text-green-700">payée</Badge>
                          : p.overdue ? <Badge variant="destructive">retard</Badge>
                            : <Badge className="bg-amber-100 text-amber-700">à payer</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Répartition catégories + top fournisseurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Dépenses par catégorie</CardTitle>
            <CardDescription>Catégorisation IA — modifiable dans « Factures d'achat »</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {catBreakdown.map(([cat, amt], i) => (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={cat === "Non catégorisé" ? "text-amber-600" : ""}>{cat}</span>
                  <span className="font-medium">{fmtEur(amt)} <span className="text-xs text-muted-foreground">({totals.exp ? Math.round((amt / totals.exp) * 100) : 0}%)</span></span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, (amt / (catBreakdown[0]?.[1] || 1)) * 100)}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                </div>
              </div>
            ))}
            {!catBreakdown.length && <div className="text-sm text-muted-foreground py-4 text-center">Aucune dépense.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top fournisseurs</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {topSuppliers.map(([name, amt], i) => (
                  <TableRow key={name}>
                    <TableCell className="text-xs text-muted-foreground w-6">{i + 1}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{name}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap text-red-700">{fmtEur(amt)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground w-12">{totals.exp ? Math.round((amt / totals.exp) * 100) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Détail facture de vente */}
      <Dialog open={!!salesDetail} onOpenChange={(o) => !o && setSalesDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="text-green-700">Facture de vente {salesDetail?.invoice_number}</DialogTitle></DialogHeader>
          {salesDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground text-xs">Client</span><div>{salesDetail.client_name || "—"}</div></div>
                <div><span className="text-muted-foreground text-xs">Bailleur</span><div>{salesDetail.leaser_name || "—"}</div></div>
                <div><span className="text-muted-foreground text-xs">Date</span><div>{salesDetail.invoice_date?.slice(0, 10) || "—"}</div></div>
                <div><span className="text-muted-foreground text-xs">Montant HTVA</span><div className="font-bold text-green-700">{fmtEurFull(salesDetail.amount)}</div></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Équipement</TableHead><TableHead className="text-center">Qté</TableHead><TableHead className="text-right">PU HT</TableHead></TableRow></TableHeader>
                <TableBody>
                  {salesDetail.lines.map((l, i) => (
                    <TableRow key={i}><TableCell className="text-xs max-w-[280px] truncate">{l.title}</TableCell><TableCell className="text-center text-xs">{l.quantity}</TableCell><TableCell className="text-right text-xs">{fmtEurFull(l.unit)}</TableCell></TableRow>
                  ))}
                  {!salesDetail.lines.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-3">Pas de détail de lignes.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Détail facture d'achat */}
      <Dialog open={!!purchaseDetail} onOpenChange={(o) => !o && setPurchaseDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="text-red-700">Facture d'achat {purchaseDetail?.invoice_number}</DialogTitle></DialogHeader>
          {purchaseDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground text-xs">Fournisseur</span><div>{purchaseDetail.supplier_name || "—"}</div></div>
                <div><span className="text-muted-foreground text-xs">Catégorie</span><div>{purchaseDetail.category || "—"}</div></div>
                <div><span className="text-muted-foreground text-xs">Date / échéance</span><div>{purchaseDetail.invoice_date?.slice(0, 10) || "—"} → {purchaseDetail.due_date?.slice(0, 10) || "—"}</div></div>
                <div><span className="text-muted-foreground text-xs">Montant HTVA</span><div className="font-bold text-red-700">{fmtEurFull(purchaseDetail.amount_excl)}</div></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Désignation</TableHead><TableHead className="text-center">Qté</TableHead><TableHead className="text-right">PU HT</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(purchaseDetail.lines || []).map((l, i) => (
                    <TableRow key={i}><TableCell className="text-xs max-w-[280px] truncate">{l.description}</TableCell><TableCell className="text-center text-xs">{l.quantity}</TableCell><TableCell className="text-right text-xs">{fmtEurFull(l.unit_price_excl)}</TableCell></TableRow>
                  ))}
                  {!(purchaseDetail.lines || []).length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-3">Pas de détail de lignes.</TableCell></TableRow>}
                </TableBody>
              </Table>
              {purchaseDetail.pdf_url && (
                <a href={purchaseDetail.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Ouvrir le PDF Billit</a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OverviewTab;
