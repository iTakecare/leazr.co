import React, { useEffect, useMemo, useState } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Wallet, Sparkles, RefreshCw, TrendingUp, AlertTriangle, PiggyBank, Receipt, LineChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import ProfitabilityTab from "@/components/gestion/ProfitabilityTab";
import CfoAiTab from "@/components/gestion/CfoAiTab";
import YukiComptaTab from "@/components/gestion/YukiComptaTab";
import { Bot, BookOpen } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import {
  SupplierInvoice,
  SupplierInvoiceMatch,
  getSupplierInvoices,
  getInvoiceMatches,
  analyzeSupplierCosts,
} from "@/services/supplierInvoiceService";
import { supabase } from "@/integrations/supabase/client";

const fmtEur = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtEurFull = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

const MONTH_LABELS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

const CostManagementPage: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [matches, setMatches] = useState<SupplierInvoiceMatch[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [inv, m, sales] = await Promise.all([
        getSupplierInvoices(companyId, fromDate),
        getInvoiceMatches(companyId),
        supabase
          .from("invoices")
          .select("amount, invoice_date")
          .eq("company_id", companyId)
          .gte("invoice_date", fromDate),
      ]);
      setInvoices(inv);
      setMatches(m.filter((x) => x.status === "confirmed"));
      setSalesTotal((sales.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0));
    } catch (e: any) {
      console.error("Erreur chargement gestion:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId, fromDate]);

  const stats = useMemo(() => {
    const sign = (i: SupplierInvoice) => (i.doc_type === "credit_note" ? -1 : 1);
    const total = invoices.reduce((s, i) => s + (i.amount_excl || 0) * sign(i), 0);
    const unpaid = invoices.filter((i) => !i.paid && i.doc_type === "invoice");
    const toPay = unpaid.reduce((s, i) => s + (i.to_pay || 0), 0);
    const overdue = invoices.filter((i) => i.overdue);
    const overdueAmt = overdue.reduce((s, i) => s + (i.to_pay || 0), 0);

    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const bySupplier: Record<string, number> = {};
    for (const i of invoices) {
      const amt = (i.amount_excl || 0) * sign(i);
      byCategory[i.category || "Non catégorisé"] = (byCategory[i.category || "Non catégorisé"] || 0) + amt;
      const month = (i.invoice_date || "").slice(0, 7);
      if (month) byMonth[month] = (byMonth[month] || 0) + amt;
      if (i.supplier_name) bySupplier[i.supplier_name] = (bySupplier[i.supplier_name] || 0) + amt;
    }
    const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const months = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, v]) => ({ mois: MONTH_LABELS[parseInt(m.slice(5), 10) - 1] || m, montant: Math.round(v) }));
    const suppliers = Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const unpaidSorted = [...unpaid].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));

    return { total, toPay, unpaidCount: unpaid.length, overdueAmt, overdueCount: overdue.length, categories, months, suppliers, unpaidSorted };
  }, [invoices]);

  // Coût de revient réel via les matchs confirmés (prix d'achat réel renseigné)
  const margin = useMemo(() => {
    const confirmedCost = matches.reduce((s, m) => s + (m.amount || 0), 0);
    return { confirmedCost, confirmedCount: matches.length };
  }, [matches]);

  const handleAnalyze = async () => {
    if (!companyId) return;
    setAnalyzing(true);
    try {
      const r = await analyzeSupplierCosts(companyId, fromDate);
      setAnalysis(r.analysis);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  const grossMargin = salesTotal - stats.total;
  const marginPct = salesTotal > 0 ? (grossMargin / salesTotal) * 100 : 0;
  const maxCat = stats.categories[0]?.[1] || 1;

  return (
    <PageTransition>
      <Container>
        <div className="py-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Gestion & coûts de revient</h1>
                <p className="text-muted-foreground text-sm">Dépenses, catégories, factures à payer et optimisation (sync Billit)</p>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <Label htmlFor="cost-from" className="text-xs">Depuis le</Label>
                <Input id="cost-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40 h-9" />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="expenses">
            <TabsList>
              <TabsTrigger value="expenses" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Dépenses
              </TabsTrigger>
              <TabsTrigger value="profitability" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" /> Rentabilité contrats
              </TabsTrigger>
              <TabsTrigger value="cfo" className="flex items-center gap-2">
                <Bot className="h-4 w-4" /> CFO IA
              </TabsTrigger>
              <TabsTrigger value="compta" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Comptabilité
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profitability" className="mt-4">
              <ProfitabilityTab />
            </TabsContent>

            <TabsContent value="cfo" className="mt-4">
              <CfoAiTab />
            </TabsContent>

            <TabsContent value="compta" className="mt-4">
              <YukiComptaTab />
            </TabsContent>

            <TabsContent value="expenses" className="mt-4 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Dépenses totales (HTVA)</div>
              <div className="text-xl font-bold">{fmtEur(stats.total)}</div>
              <div className="text-xs text-muted-foreground">{invoices.length} document(s)</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">CA ventes (HTVA)</div>
              <div className="text-xl font-bold">{fmtEur(salesTotal)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Marge brute</div>
              <div className={`text-xl font-bold ${grossMargin >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtEur(grossMargin)}</div>
              <div className="text-xs text-muted-foreground">{marginPct.toFixed(1)} % du CA</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">À payer</div>
              <div className="text-xl font-bold text-amber-600">{fmtEur(stats.toPay)}</div>
              <div className="text-xs text-muted-foreground">{stats.unpaidCount} facture(s)</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> En retard</div>
              <div className="text-xl font-bold text-red-600">{fmtEur(stats.overdueAmt)}</div>
              <div className="text-xs text-muted-foreground">{stats.overdueCount} facture(s)</div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dépenses par mois */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dépenses par mois (HTVA)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.months}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v: number) => fmtEurFull(v)} />
                      <Bar dataKey="montant" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Catégories */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
                <CardDescription>Catégorisation IA (modifiable dans Factures → Factures d'achat)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.categories.slice(0, 10).map(([cat, amt]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={cat === "Non catégorisé" ? "text-amber-600" : ""}>{cat}</span>
                      <span className="font-medium">{fmtEur(amt)} <span className="text-xs text-muted-foreground">({stats.total ? Math.round((amt / stats.total) * 100) : 0}%)</span></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(2, (amt / maxCat) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {!stats.categories.length && <div className="text-sm text-muted-foreground py-4 text-center">Aucune donnée — synchronisez les achats Billit.</div>}
              </CardContent>
            </Card>

            {/* Top fournisseurs */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top fournisseurs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {stats.suppliers.map(([name, amt], i) => (
                      <TableRow key={name}>
                        <TableCell className="text-xs text-muted-foreground w-6">{i + 1}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{name}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">{fmtEur(amt)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground w-12">{stats.total ? Math.round((amt / stats.total) * 100) : 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* À payer */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Factures à payer ({stats.unpaidCount})</CardTitle>
                <CardDescription>Triées par échéance</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead className="text-right">À payer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.unpaidSorted.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="max-w-[180px] truncate text-sm">{inv.supplier_name || inv.invoice_number}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {inv.due_date || "—"}
                            {inv.overdue && <Badge variant="destructive" className="ml-2 text-xs">retard</Badge>}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">{fmtEurFull(inv.to_pay)}</TableCell>
                        </TableRow>
                      ))}
                      {!stats.unpaidSorted.length && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Tout est payé 🎉</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coût de revient réel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><PiggyBank className="h-4 w-4" /> Coûts d'achat matériels confirmés</CardTitle>
              <CardDescription>
                Via le matching IA achats ↔ équipements de contrats (onglet Factures d'achat) : {margin.confirmedCount} équipement(s) avec prix d'achat réel confirmé, soit {fmtEurFull(margin.confirmedCost)}.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Analyse IA */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Suggestions d'optimisation (IA)</CardTitle>
                  <CardDescription>Claude analyse tes dépenses : postes anormaux, récurrents, doublons, renégociations</CardDescription>
                </div>
                <Button onClick={handleAnalyze} disabled={analyzing || !invoices.length} className="gap-2">
                  <Sparkles className={`h-4 w-4 ${analyzing ? "animate-pulse" : ""}`} />
                  {analyzing ? "Analyse en cours..." : "Analyser mes coûts"}
                </Button>
              </div>
            </CardHeader>
            {analysis && (
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </CardContent>
            )}
          </Card>

            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default CostManagementPage;
