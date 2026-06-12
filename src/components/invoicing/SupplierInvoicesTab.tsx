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
  RefreshCw, Sparkles, Link2, Search, Search as SearchIcon, FileText, ExternalLink, Check, X, CheckCheck,
} from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import {
  PURCHASE_CATEGORIES,
  SupplierInvoice,
  SupplierInvoiceLine,
  SupplierInvoiceMatch,
  getSupplierInvoices,
  syncSupplierInvoices,
  categorizeSupplierInvoices,
  suggestSupplierInvoiceMatches,
  bulkConfirmCertainMatches,
  updateSupplierInvoiceCategory,
  setSupplierInvoiceAllocation,
  getInvoiceMatches,
  confirmMatch,
  rejectMatch,
  searchContractEquipment,
  attachLineToEquipment,
  EquipmentSearchResult,
} from "@/services/supplierInvoiceService";

const fmtEur = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

// Prix réel UNITAIRE. PIÈGE Billit : le montant d'une ligne est souvent le TOTAL
// (ex. 2 × 304,96 = 609,92) mais Billit l'enregistre en qté=1 → 609,92 pris pour un
// prix unitaire. On déduit le nb d'unités via le prix prévu de l'équipement.
const smartUnitPrice = (lineTotal: number, plannedUnit: number, billitQty: number): number => {
  if (plannedUnit > 0 && lineTotal > 0) {
    const k = Math.round(lineTotal / plannedUnit);
    if (k >= 1 && Math.abs(lineTotal - k * plannedUnit) / lineTotal < 0.25) return lineTotal / k;
  }
  if (billitQty > 1) return lineTotal / billitQty;
  return lineTotal;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

// Recherche d'équipement + attribution d'une ligne d'achat (réutilisé partout).
// Liste scrollable native (le ScrollArea Radix ne se contraint pas sous un simple max-h).
const EquipmentSearchAttach: React.FC<{
  companyId: string;
  invoice: SupplierInvoice;
  line: { line_index: number; line_description: string; total: number; quantity: number };
  onAttached: () => void;
  autoFocus?: boolean;
}> = ({ companyId, invoice, line, onAttached, autoFocus }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<EquipmentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<EquipmentSearchResult | null>(null);
  const [unit, setUnit] = useState("");

  const doSearch = async (val: string) => {
    setQ(val);
    if (val.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      setResults(await searchContractEquipment(companyId, val));
    } catch (e: any) {
      toast.error(e.message || "Erreur de recherche");
    } finally {
      setSearching(false);
    }
  };

  // Choix d'un équipement -> on propose le prix réel UNITAIRE (défaut intelligent)
  const pick = (r: EquipmentSearchResult) => {
    setPending(r);
    setUnit(String(round2(smartUnitPrice(line.total, r.purchase_price || 0, line.quantity))));
  };

  const confirmAttach = async () => {
    if (!pending) return;
    const unitPrice = round2(parseFloat(unit.replace(",", ".")) || 0);
    try {
      await attachLineToEquipment(
        companyId,
        { id: invoice.id },
        { line_index: line.line_index, line_description: line.line_description, amount: unitPrice },
        pending.id,
        invoice.invoice_date,
      );
      toast.success("Ligne attribuée — prix réel unitaire enregistré");
      setPending(null);
      onAttached();
    } catch (e: any) {
      toast.error(e.message || "Erreur d'attribution");
    }
  };

  const k = pending && pending.purchase_price ? Math.round(line.total / pending.purchase_price) : line.quantity;

  if (pending) {
    return (
      <div className="space-y-2 rounded border border-blue-200 bg-blue-50/50 p-2">
        <div className="text-xs font-medium truncate">{pending.title}</div>
        <div className="text-xs text-muted-foreground">
          {pending.client_name} · contrat {pending.contract_number || "?"} · prévu {fmtEur(pending.purchase_price)}/u
        </div>
        <div className="text-xs">Total ligne facturé : <span className="font-medium">{fmtEur(line.total)}</span>{k > 1 && <> · soit ≈ <span className="font-medium">{k} unités</span></>}</div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Prix réel unitaire (€)</label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="h-8 text-xs" inputMode="decimal" autoFocus />
          </div>
          <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={confirmAttach}>Attribuer</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setPending(null)}>Annuler</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Chercher par client, n° contrat ou modèle (ex. FEBA)..."
        value={q}
        onChange={(e) => doSearch(e.target.value)}
        className="h-8 text-xs"
        autoFocus={autoFocus}
      />
      {searching && <div className="text-xs text-muted-foreground">Recherche...</div>}
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {results.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs hover:bg-muted/50">
            <div className="min-w-0">
              <div className="font-medium truncate">{r.title}</div>
              <div className="text-muted-foreground truncate">
                {r.client_name} · contrat {r.contract_number || "?"} · prévu {fmtEur(r.purchase_price)}
                {r.actual_purchase_price != null && <span className="text-amber-600"> · déjà un prix réel</span>}
                {r.serial_number && <span> · SN {String(r.serial_number).slice(0, 14)}</span>}
              </div>
            </div>
            <Button size="sm" className="h-7 shrink-0" onClick={() => pick(r)}>Attribuer</Button>
          </div>
        ))}
        {q.trim().length >= 2 && !searching && !results.length && (
          <div className="text-xs text-muted-foreground py-2">Aucun équipement trouvé pour « {q} ».</div>
        )}
      </div>
    </div>
  );
};

// Attribution manuelle d'une ligne sans suggestion (toggle + recherche)
const LineAttach: React.FC<{
  companyId: string;
  invoice: SupplierInvoice;
  lineIndex: number;
  line: SupplierInvoiceLine;
  onChanged: () => void;
}> = ({ companyId, invoice, lineIndex, line, onChanged }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={() => setOpen((o) => !o)}>
        <SearchIcon className="h-3 w-3" /> {open ? "Fermer" : "Attribuer cette ligne à un contrat / client"}
      </button>
      {open && (
        <div className="mt-2">
          <EquipmentSearchAttach
            companyId={companyId}
            invoice={invoice}
            line={{
              line_index: lineIndex,
              line_description: line.description || "",
              total: line.total_excl || line.unit_price_excl || 0,
              quantity: line.quantity || 1,
            }}
            onAttached={onChanged}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

// Carte de matching : demande + client + comparaison prix prévu / réel saisi / Billit
const MatchCard: React.FC<{
  m: SupplierInvoiceMatch;
  invoice: SupplierInvoice;
  line?: SupplierInvoiceLine;
  companyId: string;
  onConfirm: (unitPrice: number) => void;
  onReject: () => void;
  onChanged: () => void;
}> = ({ m, invoice, line, companyId, onConfirm, onReject, onChanged }) => {
  const eq = m.contract_equipment;
  const c = eq?.contracts;
  const [searchOpen, setSearchOpen] = useState(false);

  const planned = eq?.purchase_price || 0;          // prix prévu (offre/contrat), unitaire
  const real = eq?.actual_purchase_price;           // prix réel déjà saisi (Suivi des achats)
  const lineTotal = line?.total_excl || line?.unit_price_excl || m.amount || 0; // TOTAL ligne facturé
  const qty = line?.quantity || 1;
  const defaultUnit = round2(smartUnitPrice(lineTotal, planned, qty)); // prix réel unitaire déduit
  const units = planned > 0 ? Math.round(lineTotal / planned) : qty;   // nb d'unités estimé
  const [unit, setUnit] = useState(String(defaultUnit));               // prix réel unitaire éditable
  const unitNum = round2(parseFloat(unit.replace(",", ".")) || 0);

  const refPrice = real ?? planned;                 // référence de comparaison (unitaire)
  const delta = unitNum - refPrice;                 // >0 = payé plus cher que prévu/saisi (unitaire)
  const deltaColor = delta > 0.5 ? "text-red-600" : delta < -0.5 ? "text-green-600" : "text-muted-foreground";
  const scoreColor = (m.score || 0) >= 85 ? "bg-green-100 text-green-700" : (m.score || 0) >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <Card className={m.status === "confirmed" ? "border-green-400 bg-green-50/40" : m.status === "rejected" ? "opacity-50" : "border-l-4 border-l-blue-400"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">{eq?.title}</div>
            <div className="text-xs text-muted-foreground">Ligne facture : « {m.line_description} »</div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Contrat {c?.contract_number || "?"}</Badge>
              {c?.offers?.offer_number && <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">Demande {c.offers.offer_number}</Badge>}
              {c?.client_name && <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{c.client_name}</Badge>}
              <Badge className={`${scoreColor} border-0`}>score {m.score}</Badge>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {m.status === "suggested" ? (
              <>
                <Button size="sm" className="h-8 gap-1 bg-green-600 hover:bg-green-700" onClick={() => onConfirm(unitNum)}>
                  <Check className="h-3 w-3" /> Confirmer
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600 border-red-200" onClick={onReject}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Badge variant={m.status === "confirmed" ? "default" : "secondary"} className={m.status === "confirmed" ? "bg-green-600" : ""}>
                {m.status === "confirmed" ? "Confirmé" : "Rejeté"}
              </Badge>
            )}
          </div>
        </div>

        {/* Comparaison de prix (UNITAIRE) */}
        <div className="grid grid-cols-3 gap-2 text-center items-end">
          <div className="rounded-md bg-muted/60 p-2">
            <div className="text-xs text-muted-foreground">Prix prévu /u</div>
            <div className="font-medium text-sm">{fmtEur(planned)}</div>
          </div>
          <div className="rounded-md bg-amber-50 p-2 border border-amber-200">
            <div className="text-xs text-amber-700">Prix réel /u {m.status === "suggested" ? "(modifiable)" : ""}</div>
            {m.status === "suggested" ? (
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="h-7 text-sm text-center font-medium" inputMode="decimal" />
            ) : (
              <div className="font-medium text-sm">{real != null ? fmtEur(real) : fmtEur(unitNum)}</div>
            )}
          </div>
          <div className="rounded-md bg-blue-50 p-2 border border-blue-200">
            <div className="text-xs text-blue-700">Total facturé</div>
            <div className="font-bold text-sm">{fmtEur(lineTotal)}</div>
            {units > 1 && <div className="text-[10px] text-blue-600">≈ {units} u</div>}
          </div>
        </div>
        <div className={`text-xs text-right font-medium ${deltaColor}`}>
          {units > 1 && <span className="text-muted-foreground font-normal">Total {fmtEur(lineTotal)} ÷ {units} = {fmtEur(unitNum)}/u · </span>}
          Écart /u vs {real != null ? "réel saisi" : "prévu"} : {delta > 0 ? "+" : ""}{delta.toFixed(2)} €
          {m.status === "suggested" && " — confirmer écrit le prix réel unitaire"}
        </div>
        {m.reason && <div className="text-xs text-muted-foreground italic">{m.reason}</div>}

        {/* Attribution manuelle : pas le bon contrat ? */}
        <div className="pt-1 border-t">
          <button className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={() => setSearchOpen((s) => !s)}>
            <SearchIcon className="h-3 w-3" /> {searchOpen ? "Fermer" : "Pas le bon ? Attribuer à un autre contrat / client"}
          </button>
          {searchOpen && (
            <div className="mt-2">
              <EquipmentSearchAttach
                companyId={companyId}
                invoice={invoice}
                line={{ line_index: m.line_index, line_description: m.line_description || "", total: lineTotal, quantity: qty }}
                onAttached={onChanged}
                autoFocus
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const statusBadge = (inv: SupplierInvoice) => {
  if (inv.doc_type === "credit_note") return <Badge className="bg-purple-100 text-purple-700">Note de crédit</Badge>;
  if (inv.paid) return <Badge className="bg-green-100 text-green-700">Payée</Badge>;
  if (inv.overdue) return <Badge variant="destructive">En retard{inv.days_overdue ? ` ${inv.days_overdue}j` : ""}</Badge>;
  if (inv.order_status === "ToDomiciliate" || inv.payment_method === "Domiciliation")
    return <Badge className="bg-violet-100 text-violet-700">À domicilier</Badge>;
  return <Badge className="bg-amber-100 text-amber-700">À payer</Badge>;
};

const SupplierInvoicesTab: React.FC<{ costCenterId?: string | null }> = ({ costCenterId }) => {
  const { companyId } = useMultiTenant();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [matches, setMatches] = useState<SupplierInvoiceMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [matchDialogInvoice, setMatchDialogInvoice] = useState<SupplierInvoice | null>(null);

  const load = async () => {
    if (!companyId) return;
    try {
      const [inv, m] = await Promise.all([
        getSupplierInvoices(companyId, undefined, costCenterId),
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

  useEffect(() => { load(); }, [companyId, costCenterId]);

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
      // reset=true : purge les anciennes suggestions (non confirmées) et re-matche
      // proprement avec le scoring corrigé (gate marque/modèle).
      const r = await suggestSupplierInvoiceMatches(companyId, undefined, true);
      toast.success(`IA : ${r.suggestions} suggestion(s) de matching (${r.lines_examined} ligne(s) examinée(s))`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur de matching");
    } finally {
      setMatching(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (!companyId) return;
    setConfirmingBulk(true);
    try {
      const r = await bulkConfirmCertainMatches(companyId);
      if (r.confirmed) toast.success(`${r.confirmed} match(s) sûr(s) confirmé(s)${r.ambiguous ? ` · ${r.ambiguous} ligne(s) ambiguë(s) à trancher` : ""}`);
      else toast.info(r.ambiguous ? `Aucun match certain — ${r.ambiguous} ligne(s) ambiguë(s) à trancher manuellement` : "Aucune suggestion à confirmer");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setConfirmingBulk(false);
    }
  };

  const handleAllocationChange = async (inv: SupplierInvoice, allocation: "contract" | "stock" | "internal") => {
    try {
      await setSupplierInvoiceAllocation(inv.id, allocation);
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, allocation } : i)));
      if (allocation === "contract") setMatchDialogInvoice(inv); // ouvre le matching
      else toast.success(allocation === "stock" ? "Affecté au stock (en attente d'attribution)" : "Affecté en usage interne (à amortir)");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
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
    // Marchandises non affectées : catégorie = Achat de marchandises, pas d'affectation ET pas de match confirmé
    const unallocated = invoices.filter((i) =>
      i.category === "Achat de marchandises" && !i.allocation &&
      !(matchesByInvoice.get(i.id) || []).some((m) => m.status === "confirmed"),
    ).length;
    return { total, toPay, unpaidCount: unpaid.length, overdueAmt, overdueCount: overdue.length, uncategorized, unallocated };
  }, [invoices, matchesByInvoice]);

  const dialogMatches = matchDialogInvoice ? (matchesByInvoice.get(matchDialogInvoice.id) || []) : [];

  const handleConfirm = async (m: SupplierInvoiceMatch, unitPrice?: number) => {
    try {
      await confirmMatch(m, matchDialogInvoice?.invoice_date || null, unitPrice);
      toast.success("Match confirmé — prix d'achat réel unitaire enregistré sur l'équipement");
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
          {kpis.unallocated > 0 && (
            <div className="text-xs text-orange-600">{kpis.unallocated} marchandise(s) à affecter</div>
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
        <Button onClick={handleBulkConfirm} disabled={confirmingBulk || !invoices.length} variant="outline" className="gap-2 border-green-200 text-green-700 hover:bg-green-50">
          <CheckCheck className={`h-4 w-4 ${confirmingBulk ? "animate-pulse" : ""}`} />
          {confirmingBulk ? "Confirmation..." : "Confirmer les matchs sûrs"}
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
                  <TableHead>Affectation</TableHead>
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
                      <TableCell>
                        {inv.category === "Achat de marchandises" ? (
                          <Select
                            value={confirmed > 0 ? "contract" : (inv.allocation || "")}
                            onValueChange={(v) => handleAllocationChange(inv, v as any)}
                          >
                            <SelectTrigger className={`h-7 w-36 text-xs ${!inv.allocation && confirmed === 0 ? "border-amber-400 text-amber-700" : ""}`}>
                              <SelectValue placeholder="À affecter" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract">📄 Contrat (matcher)</SelectItem>
                              <SelectItem value="stock">📦 Stock</SelectItem>
                              <SelectItem value="internal">🏢 Usage interne</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">frais</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtEur(inv.amount_excl * (inv.doc_type === "credit_note" ? -1 : 1))}</TableCell>
                      <TableCell className="text-right whitespace-nowrap text-xs">{inv.paid ? "—" : fmtEur(inv.to_pay)}</TableCell>
                      <TableCell>{statusBadge(inv)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{inv.due_date || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {inv.category === "Achat de marchandises" && (
                            <Button
                              variant={confirmed > 0 ? "ghost" : "outline"}
                              size="sm"
                              className={`h-7 px-2 gap-1 ${confirmed > 0 ? "" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}
                              onClick={() => setMatchDialogInvoice(inv)}
                              title="Lier cette facture à un ou plusieurs contrats (ligne par ligne)"
                            >
                              <Link2 className="h-3 w-3" />
                              <span className="text-xs">Lier</span>
                              {confirmed > 0 && <span className="text-green-600 text-xs font-medium ml-0.5">{confirmed}</span>}
                              {suggested > 0 && <Badge variant="secondary" className="text-xs ml-0.5">{suggested}</Badge>}
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
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
              Lier aux contrats — {matchDialogInvoice?.invoice_number} ({matchDialogInvoice?.supplier_name})
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Une ligne = un équipement. Chaque ligne peut être attribuée à un contrat différent (ou laissée en stock / usage interne).
            </p>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-3 pr-3">
              {(matchDialogInvoice?.lines || []).map((line, idx) => {
                const lineMatches = dialogMatches.filter((m) => m.line_index === idx);
                const confirmed = lineMatches.some((m) => m.status === "confirmed");
                return (
                  <div key={idx} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{line.description || `Ligne ${idx + 1}`}</div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {line.quantity > 1 ? `${line.quantity} × ` : ""}{fmtEur(line.unit_price_excl)}
                      </div>
                    </div>
                    {lineMatches.map((m) => (
                      <MatchCard key={m.id} m={m} invoice={matchDialogInvoice!} line={line} companyId={companyId!} onConfirm={(u) => handleConfirm(m, u)} onReject={() => handleReject(m)} onChanged={load} />
                    ))}
                    {/* Pas de suggestion confirmée -> attribution manuelle de la ligne */}
                    {!confirmed && (
                      <LineAttach companyId={companyId!} invoice={matchDialogInvoice!} lineIndex={idx} line={line} onChanged={load} />
                    )}
                  </div>
                );
              })}
              {!(matchDialogInvoice?.lines || []).length && (
                <div className="text-center text-muted-foreground py-6">
                  Cette facture n'a pas de lignes détaillées — resynchronise Billit pour les récupérer.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierInvoicesTab;
