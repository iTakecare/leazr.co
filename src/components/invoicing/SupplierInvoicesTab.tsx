import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  RefreshCw, Sparkles, Link2, Search, FileText, ExternalLink, Check, X,
} from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import {
  PURCHASE_CATEGORIES,
  SupplierInvoice,
  SupplierInvoiceMatch,
  getSupplierInvoices,
  syncSupplierInvoices,
  categorizeSupplierInvoices,
  suggestSupplierInvoiceMatches,
  updateSupplierInvoiceCategory,
  getInvoiceMatches,
  confirmMatch,
  rejectMatch,
} from "@/services/supplierInvoiceService";

const fmtEur = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

const statusBadge = (inv: SupplierInvoice) => {
  if (inv.doc_type === "credit_note") return <Badge className="bg-purple-100 text-purple-700">Note de crédit</Badge>;
  if (inv.paid) return <Badge className="bg-green-100 text-green-700">Payée</Badge>;
  if (inv.overdue) return <Badge variant="destructive">En retard{inv.days_overdue ? ` ${inv.days_overdue}j` : ""}</Badge>;
  if (inv.order_status === "ToDomiciliate" || inv.payment_method === "Domiciliation")
    return <Badge className="bg-violet-100 text-violet-700">À domicilier</Badge>;
  return <Badge className="bg-amber-100 text-amber-700">À payer</Badge>;
};

const SupplierInvoicesTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [matches, setMatches] = useState<SupplierInvoiceMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [matchDialogInvoice, setMatchDialogInvoice] = useState<SupplierInvoice | null>(null);

  const load = async () => {
    if (!companyId) return;
    try {
      const [inv, m] = await Promise.all([
        getSupplierInvoices(companyId),
        getInvoiceMatches(companyId),
      ]);
      setInvoices(inv);
      setMatches(m);
    } catch (e: any) {
      console.error("Erreur chargement achats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);

  const handleSync = async () => {
    if (!companyId) return;
    setSyncing(true);
    try {
      const r = await syncSupplierInvoices(companyId, "2026-01-01");
      toast.success(`Sync Billit : ${r.created} nouvelle(s), ${r.updated} mise(s) à jour`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleCategorize = async () => {
    if (!companyId) return;
    setCategorizing(true);
    try {
      const r = await categorizeSupplierInvoices(companyId);
      toast.success(`IA : ${r.categorized} facture(s) catégorisée(s)${r.remaining ? `, ${r.remaining} restante(s)` : ""}`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur de catégorisation");
    } finally {
      setCategorizing(false);
    }
  };

  const handleMatch = async () => {
    if (!companyId) return;
    setMatching(true);
    try {
      const r = await suggestSupplierInvoiceMatches(companyId);
      toast.success(`IA : ${r.suggestions} suggestion(s) de matching (${r.lines_examined} ligne(s) examinée(s))`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur de matching");
    } finally {
      setMatching(false);
    }
  };

  const handleCategoryChange = async (inv: SupplierInvoice, category: string) => {
    try {
      await updateSupplierInvoiceCategory(inv.id, category);
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, category, category_source: "manual" } : i)));
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const matchesByInvoice = useMemo(() => {
    const map = new Map<string, SupplierInvoiceMatch[]>();
    for (const m of matches) {
      if (!map.has(m.supplier_invoice_id)) map.set(m.supplier_invoice_id, []);
      map.get(m.supplier_invoice_id)!.push(m);
    }
    return map;
  }, [matches]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter === "to_pay" && (inv.paid || inv.doc_type === "credit_note")) return false;
      if (statusFilter === "paid" && !inv.paid) return false;
      if (statusFilter === "overdue" && !inv.overdue) return false;
      if (categoryFilter !== "all" && (inv.category || "Non catégorisé") !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${inv.invoice_number || ""} ${inv.supplier_name || ""} ${(inv.lines || []).map((l) => l.description).join(" ")}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, categoryFilter, search]);

  const kpis = useMemo(() => {
    const sign = (i: SupplierInvoice) => (i.doc_type === "credit_note" ? -1 : 1);
    const total = invoices.reduce((s, i) => s + (i.amount_excl || 0) * sign(i), 0);
    const unpaid = invoices.filter((i) => !i.paid && i.doc_type === "invoice");
    const toPay = unpaid.reduce((s, i) => s + (i.to_pay || 0), 0);
    const overdue = invoices.filter((i) => i.overdue);
    const overdueAmt = overdue.reduce((s, i) => s + (i.to_pay || 0), 0);
    const uncategorized = invoices.filter((i) => !i.category).length;
    return { total, toPay, unpaidCount: unpaid.length, overdueAmt, overdueCount: overdue.length, uncategorized };
  }, [invoices]);

  const dialogMatches = matchDialogInvoice ? (matchesByInvoice.get(matchDialogInvoice.id) || []) : [];

  const handleConfirm = async (m: SupplierInvoiceMatch) => {
    try {
      await confirmMatch(m, matchDialogInvoice?.invoice_date || null);
      toast.success("Match confirmé — prix d'achat réel enregistré sur l'équipement");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleReject = async (m: SupplierInvoiceMatch) => {
    try {
      await rejectMatch(m.id);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Dépenses (HTVA, net NC)</div>
          <div className="text-xl font-bold">{fmtEur(kpis.total)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">À payer</div>
          <div className="text-xl font-bold text-amber-600">{fmtEur(kpis.toPay)}</div>
          <div className="text-xs text-muted-foreground">{kpis.unpaidCount} facture(s)</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">En retard</div>
          <div className="text-xl font-bold text-red-600">{fmtEur(kpis.overdueAmt)}</div>
          <div className="text-xs text-muted-foreground">{kpis.overdueCount} facture(s)</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Factures d'achat</div>
          <div className="text-xl font-bold">{invoices.length}</div>
          {kpis.uncategorized > 0 && (
            <div className="text-xs text-amber-600">{kpis.uncategorized} non catégorisée(s)</div>
          )}
        </CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronisation..." : "Synchroniser Billit"}
        </Button>
        <Button onClick={handleCategorize} disabled={categorizing || !invoices.length} variant="outline" className="gap-2">
          <Sparkles className={`h-4 w-4 ${categorizing ? "animate-pulse" : ""}`} />
          {categorizing ? "Catégorisation..." : `Catégoriser (IA)${kpis.uncategorized ? ` · ${kpis.uncategorized}` : ""}`}
        </Button>
        <Button onClick={handleMatch} disabled={matching || !invoices.length} variant="outline" className="gap-2">
          <Link2 className={`h-4 w-4 ${matching ? "animate-pulse" : ""}`} />
          {matching ? "Matching..." : "Matcher aux contrats (IA)"}
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Fournisseur, n°, description..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="to_pay">À payer</SelectItem>
            <SelectItem value="paid">Payées</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            <SelectItem value="Non catégorisé">Non catégorisé</SelectItem>
            {PURCHASE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">{filtered.length} / {invoices.length}</div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">HTVA</TableHead>
                  <TableHead className="text-right">À payer</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const invMatches = matchesByInvoice.get(inv.id) || [];
                  const suggested = invMatches.filter((m) => m.status === "suggested").length;
                  const confirmed = invMatches.filter((m) => m.status === "confirmed").length;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{inv.invoice_date || "—"}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={inv.supplier_name || ""}>{inv.supplier_name || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={(inv.lines || []).map((l) => l.description).join(" · ")}>
                        {inv.lines?.[0]?.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Select value={inv.category || ""} onValueChange={(v) => handleCategoryChange(inv, v)}>
                          <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {PURCHASE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtEur(inv.amount_excl * (inv.doc_type === "credit_note" ? -1 : 1))}</TableCell>
                      <TableCell className="text-right whitespace-nowrap text-xs">{inv.paid ? "—" : fmtEur(inv.to_pay)}</TableCell>
                      <TableCell>{statusBadge(inv)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{inv.due_date || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(suggested > 0 || confirmed > 0) && (
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setMatchDialogInvoice(inv)}>
                              <Link2 className="h-3 w-3 mr-1" />
                              {confirmed > 0 && <span className="text-green-600 text-xs">{confirmed}</span>}
                              {suggested > 0 && <Badge variant="secondary" className="text-xs ml-1">{suggested}</Badge>}
                            </Button>
                          )}
                          {inv.pdf_url && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                              <a href={inv.pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filtered.length && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Aucune facture d'achat. Cliquez sur « Synchroniser Billit » pour importer.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog matching */}
      <Dialog open={!!matchDialogInvoice} onOpenChange={(o) => !o && setMatchDialogInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Matching — {matchDialogInvoice?.invoice_number} ({matchDialogInvoice?.supplier_name})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-3">
              {dialogMatches.map((m) => (
                <Card key={m.id} className={m.status === "confirmed" ? "border-green-300" : m.status === "rejected" ? "opacity-50" : ""}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 text-sm">
                        <div className="font-medium">{m.line_description}</div>
                        <div className="text-muted-foreground text-xs">
                          → <span className="font-medium text-foreground">{m.contract_equipment?.title}</span>
                          {" · "}contrat {m.contract_equipment?.contracts?.contract_number || "?"}
                          {" · "}{m.contract_equipment?.contracts?.client_name}
                        </div>
                        <div className="text-xs">
                          Achat facturé : <strong>{fmtEur(m.amount || 0)}</strong>
                          {" · "}prévu au contrat : {fmtEur(m.contract_equipment?.purchase_price || 0)}
                          {" · "}score <Badge variant="outline" className="text-xs">{m.score}</Badge>
                        </div>
                        {m.reason && <div className="text-xs text-muted-foreground italic">{m.reason}</div>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {m.status === "suggested" ? (
                          <>
                            <Button size="sm" className="h-8 gap-1" onClick={() => handleConfirm(m)}>
                              <Check className="h-3 w-3" /> Confirmer
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleReject(m)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant={m.status === "confirmed" ? "default" : "secondary"}>
                            {m.status === "confirmed" ? "Confirmé" : "Rejeté"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!dialogMatches.length && (
                <div className="text-center text-muted-foreground py-6">Aucune suggestion pour cette facture.</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierInvoicesTab;
