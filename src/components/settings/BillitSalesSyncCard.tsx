import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, RefreshCw, Eye, AlertCircle, FileText, Link2 } from "lucide-react";
import { previewBillitDocuments, importBillitSalesInvoices, importBillitCreditNotes } from "@/services/invoiceService";
import { toast } from "sonner";
import BillitInvoiceMatchingDialog from "./BillitInvoiceMatchingDialog";

interface Props {
  companyId: string;
  integrationEnabled: boolean;
}

interface PreviewRow {
  order_id: number;
  order_number: string;
  order_date: string | null;
  customer: string | null;
  total_excl: number;
  total_incl: number;
  status: string;
  about_invoice_number: string | null;
  already_imported: boolean;
}

const fmtEur = (n: number) =>
  (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

const statusLabel = (s: string) =>
  s === "paid" ? "payée" : s === "sent" ? "envoyée" : "brouillon";

const DocTable: React.FC<{ title: string; rows: PreviewRow[] }> = ({ title, rows }) => (
  <div className="space-y-2">
    <div className="text-sm font-medium">{title} ({rows.length})</div>
    {rows.length === 0 ? (
      <div className="text-sm text-muted-foreground">Aucun document sur la période.</div>
    ) : (
      <ScrollArea className="h-64 rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">HTVA</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>État</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.order_id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{r.order_number || `#${r.order_id}`}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{r.order_date || "—"}</TableCell>
                <TableCell className="max-w-[180px] truncate" title={r.customer || ""}>{r.customer || "—"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{fmtEur(r.total_excl)}</TableCell>
                <TableCell className="text-xs">{statusLabel(r.status)}</TableCell>
                <TableCell>
                  {r.already_imported ? (
                    <Badge variant="secondary">Déjà importé</Badge>
                  ) : (
                    <Badge variant="default">Nouveau</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    )}
  </div>
);

const BillitSalesSyncCard: React.FC<Props> = ({ companyId, integrationEnabled }) => {
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [matchingOpen, setMatchingOpen] = useState(false);

  const handlePreview = async () => {
    if (!companyId) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const data = await previewBillitDocuments(companyId, fromDate);
      setPreview(data);
      const s = data.summary;
      toast.success(`Aperçu: ${s.invoices_total} facture(s) (${s.invoices_new} nouvelle(s)), ${s.credit_notes_total} NC (${s.credit_notes_new} nouvelle(s))`);
    } catch (e: any) {
      console.error("Erreur preview Billit:", e);
      toast.error(e.message || "Erreur lors de la prévisualisation");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!companyId) return;
    setImporting(true);
    try {
      const inv = await importBillitSalesInvoices(companyId, fromDate);
      const cn = await importBillitCreditNotes(companyId, fromDate);
      const importedInv = inv?.imported || 0;
      const reconInv = (inv?.reconciled || 0) + (inv?.post_reconciled || 0);
      const importedCn = cn?.imported || 0;
      toast.success(`Import terminé: ${importedInv} facture(s) (${reconInv} réconciliée(s)), ${importedCn} note(s) de crédit`);
      // Rafraîchir l'aperçu pour refléter les nouveaux "déjà importé"
      await handlePreview();
    } catch (e: any) {
      console.error("Erreur import Billit:", e);
      toast.error(e.message || "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  if (!integrationEnabled) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Synchronisation des ventes Billit (avec aperçu)
          </CardTitle>
          <CardDescription>Activez et configurez l'intégration Billit pour synchroniser vos ventes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              L'intégration Billit doit être activée et configurée (clé API + PartyID) pour utiliser cette fonctionnalité.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const s = preview?.summary;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Synchronisation des ventes Billit (avec aperçu)
          </CardTitle>
          <CardDescription>
            Prévisualisez d'abord (lecture seule), vérifiez, puis importez les factures de vente et notes de crédit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contrôles */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="billit-from-date">Depuis le</Label>
              <Input
                id="billit-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handlePreview} disabled={previewing || importing} variant="outline" className="flex items-center gap-2">
              {previewing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {previewing ? "Aperçu en cours..." : "Prévisualiser"}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || previewing || !preview || (s && s.invoices_new + s.credit_notes_new === 0)}
              className="flex items-center gap-2"
            >
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {importing
                ? "Import en cours..."
                : s
                  ? `Importer ${s.invoices_new + s.credit_notes_new} nouveauté(s)`
                  : "Importer"}
            </Button>
          </div>

          {/* Résumé */}
          {s && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground">Factures de vente</div>
                <div className="text-lg font-bold">{s.invoices_total} <span className="text-sm font-normal text-muted-foreground">dont {s.invoices_new} nouvelle(s)</span></div>
                <div className="text-xs text-muted-foreground">{fmtEur(s.invoices_total_excl)} HTVA</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground">Notes de crédit</div>
                <div className="text-lg font-bold">{s.credit_notes_total} <span className="text-sm font-normal text-muted-foreground">dont {s.credit_notes_new} nouvelle(s)</span></div>
                <div className="text-xs text-muted-foreground">{fmtEur(s.credit_notes_total_excl)} HTVA</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground">Net (factures − NC)</div>
                <div className="text-lg font-bold">{fmtEur(s.invoices_total_excl - s.credit_notes_total_excl)}</div>
                <div className="text-xs text-muted-foreground">HTVA · société {preview.used_party_id || "?"}</div>
              </div>
            </div>
          )}

          {/* Tables */}
          {preview && (
            <div className="space-y-4">
              <DocTable title="Factures de vente (Income / Invoice)" rows={preview.invoices} />
              <DocTable title="Notes de crédit (Income / CreditNote)" rows={preview.credit_notes} />
              <Button variant="ghost" size="sm" onClick={() => setMatchingOpen(true)} className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Matcher les factures aux contrats
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <div className="font-medium mb-1 flex items-center gap-2"><FileText className="h-4 w-4" /> Comment ça marche :</div>
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>Prévisualiser</strong> : lecture seule, rien n'est écrit. Vérifiez la liste et les totaux.</li>
              <li><strong>Importer</strong> : crée/réconcilie en base uniquement les documents marqués « Nouveau » depuis la date choisie.</li>
              <li>Seules les ventes (Income/Invoice & Income/CreditNote) sont concernées — les achats sont ignorés.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <BillitInvoiceMatchingDialog
        open={matchingOpen}
        onOpenChange={setMatchingOpen}
        companyId={companyId}
        onComplete={() => setMatchingOpen(false)}
      />
    </>
  );
};

export default BillitSalesSyncCard;
