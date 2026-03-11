import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RefreshCw, ShoppingCart, Link2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BillitPurchaseInvoiceMatchingDialog from "./BillitPurchaseInvoiceMatchingDialog";

interface BillitPurchaseInvoiceImportCardProps {
  companyId: string;
  integrationEnabled: boolean;
}

const BillitPurchaseInvoiceImportCard: React.FC<BillitPurchaseInvoiceImportCardProps> = ({
  companyId,
  integrationEnabled
}) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [matchingDialogOpen, setMatchingDialogOpen] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (companyId && integrationEnabled) {
      loadUnmatchedCount();
    }
  }, [companyId, integrationEnabled]);

  const loadUnmatchedCount = async () => {
    try {
      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('invoice_type', 'purchase')
        .is('contract_id', null);

      if (!error) setUnmatchedCount(count || 0);
    } catch (error) {
      console.error("Erreur chargement factures d'achat non matchées:", error);
    }
  };

  const handleImport = async () => {
    if (!companyId) {
      toast.error("Company ID manquant");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('billit-import-purchase-invoices', {
        body: { companyId }
      });

      if (error) throw new Error(error.message);

      setImportResult(data);
      setLastSync(new Date().toISOString());

      if (data.success) {
        toast.success(`${data.imported} facture(s) d'achat importée(s)`);
        setUnmatchedCount(data.unmatched_count || 0);
      } else {
        toast.error(data.message || "Erreur lors de l'import");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'import des factures d'achat");
      setImportResult({ success: false, message: error.message });
    } finally {
      setImporting(false);
    }
  };

  const handleMatchingComplete = () => {
    loadUnmatchedCount();
    setMatchingDialogOpen(false);
  };

  if (!integrationEnabled) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Import des factures d'achat Billit
          </CardTitle>
          <CardDescription>
            Activez l'intégration Billit pour importer vos factures d'achat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              L'intégration Billit doit être activée pour utiliser cette fonctionnalité.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Import des factures d'achat Billit
          </CardTitle>
          <CardDescription>
            Importez vos factures d'achat depuis Billit pour les relier à vos commandes fournisseurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{unmatchedCount}</div>
              <div className="text-sm text-muted-foreground">Factures à matcher</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-sm text-muted-foreground">Dernière synchro</div>
              <div className="text-sm font-medium">
                {lastSync ? new Date(lastSync).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                }) : 'Jamais'}
              </div>
            </div>
          </div>

          {importResult && (
            <Alert className={importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">{importResult.message}</div>
                  {importResult.success && (
                    <div className="text-sm space-y-1">
                      <div>• {importResult.imported || 0} facture(s) importée(s)</div>
                      <div>• {importResult.skipped || 0} déjà existante(s)</div>
                      <div>• {importResult.unmatched_count || 0} à matcher avec des commandes</div>
                    </div>
                  )}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      <div className="font-medium">Erreurs:</div>
                      <ul className="list-disc list-inside">
                        {importResult.errors.slice(0, 3).map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 3 && (
                          <li>...et {importResult.errors.length - 3} autre(s)</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleImport} disabled={importing} className="flex items-center gap-2">
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {importing ? "Import en cours..." : "Importer les factures d'achat"}
            </Button>

            {unmatchedCount > 0 && (
              <Button variant="outline" onClick={() => setMatchingDialogOpen(true)} className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Matcher avec les commandes
                <Badge variant="secondary" className="ml-1">{unmatchedCount}</Badge>
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <div className="font-medium mb-1">Comment ça marche :</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Cliquez sur "Importer les factures d'achat" pour récupérer vos factures Expense depuis Billit</li>
              <li>Les factures sont importées avec des suggestions de matching basées sur les montants et fournisseurs</li>
              <li>Utilisez "Matcher avec les commandes" pour relier les factures à vos commandes et ajuster les prix d'achat réels</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <BillitPurchaseInvoiceMatchingDialog
        open={matchingDialogOpen}
        onOpenChange={setMatchingDialogOpen}
        companyId={companyId}
        onComplete={handleMatchingComplete}
      />
    </>
  );
};

export default BillitPurchaseInvoiceImportCard;
