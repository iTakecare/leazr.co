import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MigrationResult {
  productId: string;
  productName: string;
  oldUrl: string;
  newUrl?: string;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

interface MigrationSummary {
  total: number;
  success: number;
  errors: number;
  skipped: number;
}

export const ImageMigrationPanel = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [results, setResults] = useState<MigrationResult[]>([]);

  const startMigration = async () => {
    setIsMigrating(true);
    setSummary(null);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-product-images', {
        body: {},
      });

      if (error) throw error;

      setSummary(data.summary);
      setResults(data.results);
      
      toast.success(
        `Migration terminée : ${data.summary.success} succès, ${data.summary.errors} erreurs`
      );
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(`Erreur lors de la migration : ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Migration des images vers Supabase Storage</CardTitle>
        <CardDescription>
          Migrer toutes les images externes (WordPress, etc.) vers Supabase Storage pour une meilleure fiabilité et performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cette opération va télécharger toutes les images hébergées sur des sites externes et les migrer vers Supabase Storage.
            Les URLs des produits seront automatiquement mises à jour.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={startMigration} 
          disabled={isMigrating}
          className="w-full"
        >
          {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isMigrating ? 'Migration en cours...' : 'Démarrer la migration'}
        </Button>

        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{summary.success}</div>
                  <p className="text-xs text-muted-foreground">Succès</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                  <p className="text-xs text-muted-foreground">Erreurs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-600">{summary.skipped}</div>
                  <p className="text-xs text-muted-foreground">Ignorés</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Détails de la migration</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm p-2 border rounded">
                        {result.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        {result.status === 'skipped' && (
                          <AlertCircle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.productName}</div>
                          {result.error && (
                            <div className="text-xs text-red-600 mt-1">{result.error}</div>
                          )}
                          {result.newUrl && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {result.newUrl}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
