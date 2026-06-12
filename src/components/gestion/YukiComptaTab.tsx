import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, RefreshCw, Settings } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";
import { getYukiIntegration, getYukiBalance, YukiBalanceSummary } from "@/services/cfoService";

const fmtEur = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const YukiComptaTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<YukiBalanceSummary | null>(null);
  const [rows, setRows] = useState<Array<{ code: string; description: string; amount: number }>>([]);

  useEffect(() => {
    if (!companyId) return;
    getYukiIntegration(companyId).then((d) => setConfigured(!!d?.is_enabled));
  }, [companyId]);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const r = await getYukiBalance(companyId, date);
      setSummary(r.summary);
      setRows(r.rows);
    } catch (e: any) {
      toast.error(e.message || "Lecture Yuki échouée");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (configured) load(); }, [configured]);

  const pnlRows = useMemo(() => rows.filter((r) => /^[67]/.test(r.code)).sort((a, b) => a.code.localeCompare(b.code)), [rows]);

  if (configured === false) {
    return (
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Yuki n'est pas encore connecté. Va dans <strong>Paramètres → Intégrations → Yuki</strong> pour
          renseigner ta clé API Webservices (lecture seule). Les chiffres comptables (trésorerie, charges réelles,
          salaires, amortissements) alimenteront alors cette vue et le CFO IA.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div>
          <Label htmlFor="yuki-date" className="text-xs">Soldes à la date</Label>
          <Input id="yuki-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 h-9" />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Lecture Yuki..." : "Actualiser"}
        </Button>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Trésorerie (55)</div>
              <div className={`text-xl font-bold ${summary.tresorerie_55 >= 0 ? "" : "text-red-600"}`}>{fmtEur(summary.tresorerie_55)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Résultat (7 − 6)</div>
              <div className={`text-xl font-bold ${summary.resultat >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtEur(summary.resultat)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Clients à encaisser (40)</div>
              <div className="text-xl font-bold">{fmtEur(summary.clients_40)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Fournisseurs à payer (44)</div>
              <div className="text-xl font-bold">{fmtEur(Math.abs(summary.fournisseurs_44))}</div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Achats (60)</div>
              <div className="text-lg font-bold">{fmtEur(summary.achats_60)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Services & biens (61)</div>
              <div className="text-lg font-bold">{fmtEur(summary.services_biens_61)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Salaires & RH (62)</div>
              <div className="text-lg font-bold">{fmtEur(summary.salaires_62)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Amortissements (63)</div>
              <div className="text-lg font-bold">{fmtEur(summary.amortissements_63)}</div>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Compte de résultat (classes 6 & 7)</CardTitle>
              <CardDescription>Soldes cumulés au {date} — source Yuki (lecture seule)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compte</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pnlRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.code}</TableCell>
                        <TableCell className="text-sm">{r.description}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{fmtEur(r.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {!pnlRows.length && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucune donnée à cette date.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default YukiComptaTab;
