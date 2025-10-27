import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, TrendingUp, Users, FileText, RefreshCw } from 'lucide-react';

interface ImportReport {
  success: boolean;
  byYear: {
    [year: number]: {
      processed: number;
      clientsCreated: number;
      clientsEnriched: number;
      offersCreated: number;
      offersUpdated: number;
      contractsCreated: number;
    };
  };
  globalStats: {
    totalProcessed: number;
    clientsCreated: number;
    clientsEnriched: number;
    offersCreated: number;
    offersUpdated: number;
    contractsCreated: number;
  };
  conflicts: Array<{
    type: string;
    dossier_number: string;
    year: number;
    error?: string;
  }>;
  enrichments: Array<{
    client: string;
    year: number;
    fields: string[];
  }>;
}

export const MultiYearContractsImport = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setReport(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 800);

      const { data, error: invokeError } = await supabase.functions.invoke('import-contracts-multi-years', {
        body: {}
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (invokeError) throw invokeError;

      setReport(data);
      
      if (data.success) {
        toast.success(`Import réussi ! ${data.globalStats.contractsCreated} contrats créés.`);
      } else {
        toast.error('Import terminé avec des erreurs');
      }
    } catch (err) {
      console.error('Erreur lors de l\'import:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error('Erreur lors de l\'import des contrats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Multi-Années (2022-2025)
            </CardTitle>
            <CardDescription>
              Importer les contrats de leasing des 4 dernières années (165 contrats)
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            4 années
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Source info */}
        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Fichiers sources intégrés :</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 2022-Tableau_1.csv (~20 contrats)</li>
                <li>• 2023-Tableau_1.csv (~57 contrats)</li>
                <li>• 2024-Tableau_1.csv (~61 contrats)</li>
                <li>• 2025-Tableau_1.csv (~27 contrats)</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Options */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="font-medium text-sm">Options d'import :</p>
          <ul className="text-sm space-y-1 ml-4">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Enrichir les clients existants (ville/secteur)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Mettre à jour les offres si doublon détecté
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Import chronologique (2022 → 2025)
            </li>
          </ul>
        </div>

        {/* Import button */}
        {!report && (
          <Button 
            onClick={handleImport} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Lancer l'import de ~165 contrats
              </>
            )}
          </Button>
        )}

        {/* Progress bar */}
        {loading && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              Traitement en cours... {progress}%
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success report */}
        {report && report.success && (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">
                Import terminé avec succès !
              </AlertDescription>
            </Alert>

            {/* Global stats */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Statistiques globales
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{report.globalStats.totalProcessed}</div>
                  <div className="text-xs text-blue-600">Contrats traités</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{report.globalStats.clientsCreated}</div>
                  <div className="text-xs text-green-600">Clients créés</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700">{report.globalStats.clientsEnriched}</div>
                  <div className="text-xs text-purple-600">Clients enrichis</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700">{report.globalStats.offersCreated}</div>
                  <div className="text-xs text-orange-600">Offres créées</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{report.globalStats.offersUpdated}</div>
                  <div className="text-xs text-yellow-600">Offres mises à jour</div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="text-2xl font-bold text-indigo-700">{report.globalStats.contractsCreated}</div>
                  <div className="text-xs text-indigo-600">Contrats créés</div>
                </div>
              </div>
            </div>

            {/* Stats by year */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Par année
              </h3>
              <div className="space-y-2">
                {Object.entries(report.byYear).map(([year, stats]) => (
                  <div key={year} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{year}</span>
                      <Badge variant="outline">{stats.processed} contrats</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Clients créés:</span>
                        <span className="ml-1 font-medium">{stats.clientsCreated}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Enrichis:</span>
                        <span className="ml-1 font-medium">{stats.clientsEnriched}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Offres:</span>
                        <span className="ml-1 font-medium">{stats.offersCreated}+{stats.offersUpdated}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conflicts */}
            {report.conflicts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Mises à jour ({report.conflicts.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {report.conflicts.slice(0, 10).map((conflict, idx) => (
                    <div key={idx} className="text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                      {conflict.type === 'offer_updated' ? (
                        <span>Dossier <strong>{conflict.dossier_number}</strong> ({conflict.year}): Offre mise à jour</span>
                      ) : (
                        <span className="text-red-600">Dossier {conflict.dossier_number}: {conflict.error}</span>
                      )}
                    </div>
                  ))}
                  {report.conflicts.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      ... et {report.conflicts.length - 10} autres
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Enrichments */}
            {report.enrichments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Enrichissements clients ({report.enrichments.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {report.enrichments.slice(0, 10).map((enrich, idx) => (
                    <div key={idx} className="text-sm p-2 bg-purple-50 border border-purple-200 rounded">
                      <strong>{enrich.client}</strong> ({enrich.year}): {enrich.fields.join(', ')} ajouté(s)
                    </div>
                  ))}
                  {report.enrichments.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      ... et {report.enrichments.length - 10} autres
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Manual actions */}
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <p className="font-medium text-amber-900 mb-2">Actions manuelles requises :</p>
                <ul className="text-sm text-amber-800 space-y-1 ml-4">
                  <li>✏️ Remplir les <code>contract_number</code> pour {report.globalStats.contractsCreated} contrats</li>
                  <li>🔍 Vérifier les clients enrichis dans la liste ci-dessus</li>
                  <li>📊 Vérifier les statistiques dans le dashboard</li>
                  <li>🔗 Vérifier les liens offres ↔ contrats</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Reset button */}
            <Button 
              variant="outline" 
              onClick={() => setReport(null)}
              className="w-full"
            >
              Fermer le rapport
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
