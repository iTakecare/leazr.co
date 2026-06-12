import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, RefreshCw, Settings, FileDown, ChevronRight, ChevronDown, Landmark } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import { getYukiIntegration, getYukiBalance } from "@/services/cfoService";

const fmtEur = (n: number) => (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtEurFull = (n: number) => (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

interface GLRow { code: string; description: string; amount: number }

// Groupes PCMN belges. sign=-1 pour les produits (soldes créditeurs négatifs dans Yuki).
const PRODUCT_GROUPS = [
  { key: "ca", label: "Chiffre d'affaires", prefixes: ["70"], sign: -1 },
  { key: "autres_prod", label: "Autres produits d'exploitation", prefixes: ["74", "71", "72"], sign: -1 },
  { key: "prod_fin", label: "Produits financiers", prefixes: ["75", "76"], sign: -1 },
];
const CHARGE_GROUPS = [
  { key: "achats", label: "Approvisionnements et marchandises", prefixes: ["60"], sign: 1 },
  { key: "services", label: "Services et biens divers", prefixes: ["61"], sign: 1 },
  { key: "remunerations", label: "Rémunérations & charges sociales", prefixes: ["62"], sign: 1 },
  { key: "amortissements", label: "Amortissements & réductions de valeur", prefixes: ["63"], sign: 1 },
  { key: "autres_charges", label: "Autres charges d'exploitation", prefixes: ["64"], sign: 1 },
  { key: "charges_fin", label: "Charges financières", prefixes: ["65", "66"], sign: 1 },
  { key: "impots", label: "Impôts", prefixes: ["67", "77"], sign: 1 },
];

const buildGroup = (rows: GLRow[], g: { key: string; label: string; prefixes: string[]; sign: number }) => {
  const accounts = rows
    .filter((r) => g.prefixes.some((p) => r.code.startsWith(p)))
    .map((r) => ({ code: r.code, description: r.description, amount: r.amount * g.sign }))
    .filter((a) => Math.abs(a.amount) > 0.005)
    .sort((a, b) => b.amount - a.amount);
  return { ...g, accounts, total: accounts.reduce((s, a) => s + a.amount, 0) };
};

const YukiComptaTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GLRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId) return;
    getYukiIntegration(companyId).then((d) => setConfigured(!!d?.is_enabled));
  }, [companyId]);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const r = await getYukiBalance(companyId, date);
      setRows(r.rows || []);
    } catch (e: any) {
      toast.error(e.message || "Lecture Yuki échouée");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (configured) load(); }, [configured]);

  const products = useMemo(() => PRODUCT_GROUPS.map((g) => buildGroup(rows, g)), [rows]);
  const charges = useMemo(() => CHARGE_GROUPS.map((g) => buildGroup(rows, g)), [rows]);
  const totalProducts = products.reduce((s, g) => s + g.total, 0);
  const totalCharges = charges.reduce((s, g) => s + g.total, 0);
  const resultat = totalProducts - totalCharges;
  const margeBrute = (products.find((g) => g.key === "ca")?.total || 0)
    + (products.find((g) => g.key === "autres_prod")?.total || 0)
    - (charges.find((g) => g.key === "achats")?.total || 0);

  const banks = useMemo(() =>
    rows.filter((r) => r.code.startsWith("55")).map((r) => ({ ...r })).sort((a, b) => a.code.localeCompare(b.code)),
    [rows]);
  const clients = rows.filter((r) => r.code.startsWith("40")).reduce((s, r) => s + r.amount, 0);
  const fournisseurs = rows.filter((r) => r.code.startsWith("44")).reduce((s, r) => s + r.amount, 0);
  const tresorerie = banks.reduce((s, r) => s + r.amount, 0);

  const toggle = (key: string) => setExpanded((prev) => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  const exportPdf = (kind: "synthese" | "detaille") => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("iTakecare — Compte de résultat", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Source Yuki · soldes au ${date} · ${kind === "detaille" ? "détaillé" : "synthèse"}`, 14, 25);
    doc.setTextColor(0);

    const body: any[] = [];
    const pushGroup = (g: any) => {
      body.push([{ content: g.label, styles: { fontStyle: "bold" } }, { content: fmtEurFull(g.total), styles: { fontStyle: "bold", halign: "right" } }]);
      if (kind === "detaille") {
        for (const a of g.accounts) body.push([`   ${a.code}  ${a.description}`, { content: fmtEurFull(a.amount), styles: { halign: "right", textColor: 120 } }]);
      }
    };
    body.push([{ content: "PRODUITS", styles: { fontStyle: "bold", fillColor: [220, 252, 231] } }, { content: fmtEurFull(totalProducts), styles: { fontStyle: "bold", halign: "right", fillColor: [220, 252, 231] } }]);
    products.forEach(pushGroup);
    body.push([{ content: "CHARGES", styles: { fontStyle: "bold", fillColor: [254, 226, 226] } }, { content: fmtEurFull(totalCharges), styles: { fontStyle: "bold", halign: "right", fillColor: [254, 226, 226] } }]);
    charges.forEach(pushGroup);
    body.push([{ content: "RÉSULTAT", styles: { fontStyle: "bold" } }, { content: fmtEurFull(resultat), styles: { fontStyle: "bold", halign: "right", textColor: resultat >= 0 ? [22, 163, 74] : [220, 38, 38] } }]);

    autoTable(doc, { startY: 32, head: [["Poste", "Montant"]], body, theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: [51, 65, 85] }, columnStyles: { 1: { halign: "right" } } });

    let y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11); doc.text("Trésorerie & créances", 14, y); y += 2;
    autoTable(doc, {
      startY: y + 2,
      head: [["", "Montant"]],
      body: [
        ["Trésorerie (banques, classe 55)", { content: fmtEurFull(tresorerie), styles: { halign: "right" } }],
        ["Clients à encaisser (classe 40)", { content: fmtEurFull(clients), styles: { halign: "right" } }],
        ["Fournisseurs à payer (classe 44)", { content: fmtEurFull(Math.abs(fournisseurs)), styles: { halign: "right" } }],
      ],
      theme: "plain", styles: { fontSize: 9 },
    });
    doc.save(`itakecare-resultat-${date}-${kind}.pdf`);
  };

  if (configured === false) {
    return (
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Yuki n'est pas encore connecté. Va dans <strong>Paramètres → Intégrations → Yuki</strong> pour renseigner ta clé API Webservices (lecture seule).
        </AlertDescription>
      </Alert>
    );
  }

  const GroupBlock: React.FC<{ g: ReturnType<typeof buildGroup>; color: string }> = ({ g, color }) => (
    <>
      <div className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/50 cursor-pointer rounded" onClick={() => toggle(g.key)}>
        <div className="flex items-center gap-1 text-sm font-medium">
          {expanded.has(g.key) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {g.label}
          <span className="text-xs text-muted-foreground">({g.accounts.length})</span>
        </div>
        <div className={`text-sm font-semibold ${color}`}>{fmtEur(g.total)}</div>
      </div>
      {expanded.has(g.key) && g.accounts.map((a) => (
        <div key={a.code} className="flex items-center justify-between py-1 pl-8 pr-2 text-xs text-muted-foreground border-b last:border-0">
          <span><span className="font-mono">{a.code}</span> · {a.description}</span>
          <span>{fmtEurFull(a.amount)}</span>
        </div>
      ))}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="yuki-date" className="text-xs">Soldes à la date</Label>
            <Input id="yuki-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 h-9" />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Lecture Yuki..." : "Actualiser"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => exportPdf("synthese")} disabled={!rows.length}>
            <FileDown className="h-4 w-4" /> Rapport synthèse (PDF)
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => exportPdf("detaille")} disabled={!rows.length}>
            <FileDown className="h-4 w-4" /> Rapport détaillé (PDF)
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Résultat</div>
          <div className={`text-xl font-bold ${resultat >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtEur(resultat)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Marge brute</div>
          <div className="text-xl font-bold">{fmtEur(margeBrute)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Trésorerie (55)</div>
          <div className={`text-xl font-bold ${tresorerie >= 0 ? "" : "text-red-600"}`}>{fmtEur(tresorerie)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Clients / Fournisseurs</div>
          <div className="text-sm font-bold text-green-600">{fmtEur(clients)}</div>
          <div className="text-sm font-bold text-red-600">−{fmtEur(Math.abs(fournisseurs))}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compte de résultat hiérarchique */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Compte de résultat</CardTitle>
            <CardDescription>Soldes cumulés au {date} — source Yuki (cliquez un poste pour le détail)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1.5 bg-green-50 rounded text-green-800 font-semibold text-sm">
              <span>PRODUITS</span><span>{fmtEur(totalProducts)}</span>
            </div>
            {products.map((g) => <GroupBlock key={g.key} g={g} color="text-green-700" />)}
            <div className="flex items-center justify-between px-2 py-1.5 bg-red-50 rounded text-red-800 font-semibold text-sm mt-2">
              <span>CHARGES</span><span>{fmtEur(totalCharges)}</span>
            </div>
            {charges.map((g) => <GroupBlock key={g.key} g={g} color="text-red-700" />)}
            <div className={`flex items-center justify-between px-2 py-2 rounded font-bold mt-2 ${resultat >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              <span>RÉSULTAT</span><span>{fmtEur(resultat)}</span>
            </div>
            {!rows.length && <div className="text-center text-muted-foreground py-6 text-sm">{loading ? "Lecture en cours..." : "Cliquez sur Actualiser pour lire la compta Yuki."}</div>}
          </CardContent>
        </Card>

        {/* Comptes bancaires */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Landmark className="h-4 w-4" /> Comptes bancaires</CardTitle>
            <CardDescription>Soldes classe 55</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {banks.map((b) => (
              <div key={b.code} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div className="text-sm">
                  <div className="font-medium truncate max-w-[180px]">{b.description}</div>
                  <div className="text-xs text-muted-foreground font-mono">{b.code}</div>
                </div>
                <div className={`text-sm font-semibold ${b.amount >= 0 ? "" : "text-red-600"}`}>{fmtEurFull(b.amount)}</div>
              </div>
            ))}
            {banks.length > 0 && (
              <div className="flex items-center justify-between pt-2 font-bold text-sm">
                <span>Total trésorerie</span>
                <span className={tresorerie >= 0 ? "" : "text-red-600"}>{fmtEurFull(tresorerie)}</span>
              </div>
            )}
            {!banks.length && <div className="text-xs text-muted-foreground py-3 text-center">Aucun compte (classe 55) à cette date.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default YukiComptaTab;
