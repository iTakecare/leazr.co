import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RefreshCw, FileText, Link2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BillitInvoiceMatchingDialog from "./BillitInvoiceMatchingDialog";

interface BillitInvoiceImportCardProps {
  companyId: string;
  integrationEnabled: boolean;
}

const BillitInvoiceImportCard: React.FC<BillitInvoiceImportCardProps> = ({ 
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
        .is('contract_id', null);

      if (!error) {
        setUnmatchedCount(count || 0);
      }
    } catch (error) {
      console.error("Erreur chargement factures non matchées:", error);
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
      console.log("📥 Démarrage import factures Billit...");
      
      const { data, error } = await supabase.functions.invoke('billit-import-invoices', {
        body: { companyId }
      });

      if (error) {
        console.error("❌ Erreur Edge Function:", error);
        throw new Error(error.message);
      }

      setImportResult(data);
      setLastSync(new Date().toISOString());
      
      if (data.success) {
        toast.success(`${data.imported} facture(s) importée(s) avec succès`);
        setUnmatchedCount(data.unmatched_count || 0);
      } else {
        toast.error(data.message || "Erreur lors de l'import");
      }
    } catch (error: any) {
      console.error("Erreur import:", error);
      toast.error(error.message || "Erreur lors de l'import des factures");
      setImportResult({
        success: false,
        message: error.message
      });
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
            <Download className="h-5 w-5" />
            Import des factures Billit
          </CardTitle>
          <CardDescription>
            Activez l'intégration Billit pour importer vos factures existantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              L'intégration Billit doit être activée et configurée pour utiliser cette fonctionnalité.
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
            <Download className="h-5 w-5" />
            Import des factures Billit
          </CardTitle>
          <CardDescription>
            Importez vos factures existantes depuis Billit pour les synchroniser avec vos contrats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{unmatchedCount}</div>
              <div className="text-sm text-muted-foreground">Factures à matcher</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-sm text-muted-foreground">Dernière synchro</div>
              <div className="text-sm font-medium">
                {lastSync ? new Date(lastSync).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Jamais'}
              </div>
            </div>
          </div>

          {/* Résultat de l'import */}
          {importResult && (
            <Alert className={importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">{importResult.message}</div>
                  {importResult.success && (
                    <div className="text-sm space-y-1">
                      <div>• {importResult.imported || 0} facture(s) importée(s)</div>
                      <div>• {importResult.skipped || 0} déjà existante(s)</div>
                      <div>• {importResult.unmatched_count || 0} à matcher avec des contrats</div>
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

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleImport} 
              disabled={importing}
              className="flex items-center gap-2"
            >
              {importing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {importing ? "Import en cours..." : "Importer les factures"}
            </Button>

            {unmatchedCount > 0 && (
              <Button 
                variant="outline"
                onClick={() => setMatchingDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" />
                Matcher les factures
                <Badge variant="secondary" className="ml-1">
                  {unmatchedCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <div className="font-medium mb-1">Comment ça marche :</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Cliquez sur "Importer les factures" pour récupérer vos factures Income depuis Billit</li>
              <li>Les factures sont importées avec des suggestions automatiques de matching basées sur les montants</li>
              <li>Utilisez "Matcher les factures" pour associer manuellement les factures à vos contrats</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <BillitInvoiceMatchingDialog
        open={matchingDialogOpen}
        onOpenChange={setMatchingDialogOpen}
        companyId={companyId}
        onComplete={handleMatchingComplete}
      />
    </>
  );
};

export default BillitInvoiceImportCard;
