import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BillitCreditNoteImportCardProps {
  companyId: string;
  integrationEnabled: boolean;
}

const BillitCreditNoteImportCard: React.FC<BillitCreditNoteImportCardProps> = ({
  companyId,
  integrationEnabled
}) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleImport = async () => {
    if (!companyId) {
      toast.error("Company ID manquant");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('billit-import-credit-notes', {
        body: { companyId }
      });

      if (error) throw new Error(error.message);

      setImportResult(data);
      if (data.success) {
        toast.success(`${data.imported} note(s) de crédit importée(s)`);
      } else {
        toast.error(data.message || "Erreur lors de l'import");
      }
    } catch (error: any) {
      console.error("Erreur import NC:", error);
      toast.error(error.message || "Erreur lors de l'import des notes de crédit");
      setImportResult({ success: false, message: error.message });
    } finally {
      setImporting(false);
    }
  };

  if (!integrationEnabled) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import des notes de crédit Billit
          </CardTitle>
          <CardDescription>
            Activez l'intégration Billit pour importer vos notes de crédit
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import des notes de crédit Billit
        </CardTitle>
        <CardDescription>
          Importez vos notes de crédit depuis Billit et liez-les automatiquement aux factures existantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {importResult && (
          <Alert className={importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">{importResult.message}</div>
                {importResult.success && (
                  <div className="text-sm space-y-1">
                    <div>• {importResult.imported || 0} note(s) de crédit importée(s)</div>
                    <div>• {importResult.matched || 0} liée(s) à des factures</div>
                    <div>• {importResult.skipped || 0} déjà existante(s)</div>
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    <div className="font-medium">Erreurs:</div>
                    <ul className="list-disc list-inside">
                      {importResult.errors.slice(0, 3).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleImport} disabled={importing} className="flex items-center gap-2">
          {importing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {importing ? "Import en cours..." : "Importer les notes de crédit"}
        </Button>

        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
          <div className="font-medium mb-1">Comment ça marche :</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Les notes de crédit (CreditNote Income) sont récupérées depuis Billit</li>
            <li>Chaque NC est automatiquement liée à sa facture via le numéro de référence ou par montant/client</li>
            <li>Le statut de la facture liée est mis à jour (crédité / crédit partiel)</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillitCreditNoteImportCard;
