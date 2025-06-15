
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, Database, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  file_size_limit?: number;
  allowed_mime_types?: string[];
  created_at: string;
  updated_at: string;
}

interface FileInfo {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: any;
}

interface MultiTenantAnalysis {
  bucketName: string;
  totalFiles: number;
  multiTenantFiles: number;
  nonMultiTenantFiles: number;
  companies: string[];
  issues: string[];
}

const MultiTenantStorageAnalyzer: React.FC = () => {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [analysis, setAnalysis] = useState<MultiTenantAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const loadBuckets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Erreur lors du chargement des buckets:', error);
        toast.error('Erreur lors du chargement des buckets');
        return;
      }

      setBuckets(data || []);
      console.log('Buckets trouvés:', data);
    } catch (error) {
      console.error('Erreur générale:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const analyzeMultiTenantCompliance = async () => {
    setAnalyzing(true);
    const analysisResults: MultiTenantAnalysis[] = [];

    try {
      for (const bucket of buckets) {
        console.log(`Analyse du bucket: ${bucket.id}`);
        
        const { data: files, error } = await supabase.storage
          .from(bucket.id)
          .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
          console.error(`Erreur pour le bucket ${bucket.id}:`, error);
          continue;
        }

        const analysis: MultiTenantAnalysis = {
          bucketName: bucket.id,
          totalFiles: files?.length || 0,
          multiTenantFiles: 0,
          nonMultiTenantFiles: 0,
          companies: [],
          issues: []
        };

        if (files && files.length > 0) {
          for (const file of files) {
            if (file.name.startsWith('company-')) {
              analysis.multiTenantFiles++;
              const companyMatch = file.name.match(/^company-([^\/]+)\//);
              if (companyMatch) {
                const companyId = companyMatch[1];
                if (!analysis.companies.includes(companyId)) {
                  analysis.companies.push(companyId);
                }
              }
            } else if (!file.name.startsWith('.') && file.name !== '.emptyFolderPlaceholder') {
              analysis.nonMultiTenantFiles++;
              analysis.issues.push(`Fichier non multi-tenant: ${file.name}`);
            }
          }
        }

        // Vérifications spécifiques par bucket
        if (bucket.id === 'site-settings') {
          if (analysis.nonMultiTenantFiles > 0) {
            analysis.issues.push('Le bucket site-settings devrait utiliser une structure multi-tenant pour les logos d\'entreprise');
          }
        }

        if (bucket.id === 'product-images') {
          if (analysis.nonMultiTenantFiles > 0) {
            analysis.issues.push('Les images de produits devraient être organisées par entreprise');
          }
        }

        analysisResults.push(analysis);
      }

      setAnalysis(analysisResults);
      console.log('Analyse terminée:', analysisResults);
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      toast.error('Erreur lors de l\'analyse multi-tenant');
    } finally {
      setAnalyzing(false);
    }
  };

  const fixMultiTenantIssues = async () => {
    toast.info('Correction automatique des problèmes multi-tenant...');
    
    // Pour chaque bucket avec des problèmes, on pourrait implémenter des corrections
    // Par exemple, déplacer les fichiers vers la structure company-{id}/
    
    toast.success('Analyse terminée. Vérifiez les recommandations ci-dessous.');
  };

  useEffect(() => {
    loadBuckets();
  }, []);

  const getComplianceColor = (analysis: MultiTenantAnalysis) => {
    if (analysis.issues.length === 0) return 'text-green-600';
    if (analysis.issues.length <= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceIcon = (analysis: MultiTenantAnalysis) => {
    if (analysis.issues.length === 0) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Analyse Multi-Tenant du Stockage</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadBuckets} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Actualiser Buckets
          </Button>
          <Button onClick={analyzeMultiTenantCompliance} disabled={analyzing || buckets.length === 0}>
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Analyser Multi-Tenant
          </Button>
        </div>
      </div>

      {/* Liste des Buckets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Buckets de Stockage ({buckets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Chargement des buckets...</span>
            </div>
          ) : buckets.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Aucun bucket trouvé. Cela peut indiquer un problème de permissions ou de configuration.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buckets.map((bucket) => (
                <Card key={bucket.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{bucket.id}</h3>
                      <Badge variant={bucket.public ? "default" : "secondary"}>
                        {bucket.public ? "Public" : "Privé"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Nom: {bucket.name}</div>
                      {bucket.file_size_limit && (
                        <div>Limite: {(bucket.file_size_limit / 1024 / 1024).toFixed(1)} MB</div>
                      )}
                      <div>Créé: {new Date(bucket.created_at).toLocaleDateString()}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analyse Multi-Tenant */}
      {analysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Analyse de Conformité Multi-Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.map((bucketAnalysis) => (
                <Card key={bucketAnalysis.bucketName} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getComplianceIcon(bucketAnalysis)}
                        <h4 className="font-semibold">{bucketAnalysis.bucketName}</h4>
                      </div>
                      <div className={`text-sm font-medium ${getComplianceColor(bucketAnalysis)}`}>
                        {bucketAnalysis.issues.length === 0 ? 'Conforme' : `${bucketAnalysis.issues.length} problème(s)`}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{bucketAnalysis.totalFiles}</div>
                        <div className="text-xs text-muted-foreground">Total fichiers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{bucketAnalysis.multiTenantFiles}</div>
                        <div className="text-xs text-muted-foreground">Multi-tenant</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{bucketAnalysis.nonMultiTenantFiles}</div>
                        <div className="text-xs text-muted-foreground">Non conforme</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{bucketAnalysis.companies.length}</div>
                        <div className="text-xs text-muted-foreground">Entreprises</div>
                      </div>
                    </div>

                    {bucketAnalysis.companies.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-2">Entreprises détectées:</div>
                        <div className="flex flex-wrap gap-1">
                          {bucketAnalysis.companies.map((companyId) => (
                            <Badge key={companyId} variant="outline" className="text-xs">
                              {companyId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {bucketAnalysis.issues.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2 text-yellow-600">Problèmes détectés:</div>
                        <div className="space-y-1">
                          {bucketAnalysis.issues.slice(0, 5).map((issue, index) => (
                            <div key={index} className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
                              {issue}
                            </div>
                          ))}
                          {bucketAnalysis.issues.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              ... et {bucketAnalysis.issues.length - 5} autres problèmes
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {analysis.some(a => a.issues.length > 0) && (
              <div className="mt-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Recommandations:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Organisez tous les fichiers avec la structure: company-{'{company_id}'}/nom-fichier</li>
                      <li>Migrez les fichiers existants vers cette structure</li>
                      <li>Mettez à jour les services d'upload pour utiliser le service multi-tenant</li>
                      <li>Vérifiez que les politiques RLS respectent la séparation par entreprise</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiTenantStorageAnalyzer;
