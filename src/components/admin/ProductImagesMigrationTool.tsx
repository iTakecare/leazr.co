
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, Database, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { migrateProductImagesToMultiTenant, getITakecareCompanyId } from "@/utils/migrateProductImagesToMultiTenant";

const ProductImagesMigrationTool: React.FC = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const loadCompanyInfo = async () => {
    const id = await getITakecareCompanyId();
    setCompanyId(id);
    if (id) {
      toast.success(`Entreprise cible identifiée: ${id}`);
    } else {
      toast.error("Impossible d'identifier l'entreprise cible");
    }
  };

  const startMigration = async () => {
    if (!companyId) {
      toast.error("Veuillez d'abord identifier l'entreprise cible");
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      toast.info("Début de la migration multi-tenant...");
      
      const result = await migrateProductImagesToMultiTenant(companyId);
      setMigrationResult(result);

      if (result.success) {
        toast.success(`Migration réussie ! ${result.migratedFiles} fichiers migrés, ${result.updatedProducts} produits mis à jour`);
      } else {
        toast.error(`Migration terminée avec des erreurs. ${result.errors.length} erreurs détectées.`);
      }

    } catch (error) {
      console.error("Erreur de migration:", error);
      toast.error("Erreur lors de la migration");
      setMigrationResult({
        success: false,
        migratedFiles: 0,
        updatedProducts: 0,
        errors: [`Erreur générale: ${error}`]
      });
    } finally {
      setIsMigrating(false);
    }
  };

  React.useEffect(() => {
    loadCompanyInfo();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Migration Images Produits Multi-Tenant</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Migration vers la Structure Multi-Tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cette opération va :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Déplacer toutes les images du bucket product-images vers la structure company-{companyId}/</li>
                <li>Mettre à jour les références dans la base de données</li>
                <li>Supprimer les anciens fichiers à la racine</li>
                <li><strong>Cette opération est irréversible !</strong></li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="text-sm font-medium">Entreprise cible:</div>
            {companyId ? (
              <div className="font-mono bg-green-50 text-green-700 p-2 rounded border border-green-200">
                company-{companyId}
              </div>
            ) : (
              <div className="font-mono bg-red-50 text-red-700 p-2 rounded border border-red-200">
                Non identifiée
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={loadCompanyInfo} 
              variant="outline"
              disabled={isMigrating}
            >
              Identifier l'entreprise
            </Button>
            
            <Button 
              onClick={startMigration} 
              disabled={isMigrating || !companyId}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Migration en cours...
                </>
              ) : (
                "Démarrer la migration"
              )}
            </Button>
          </div>

          {migrationResult && (
            <div className="mt-6">
              <div className={`p-4 rounded-md ${migrationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {migrationResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className="font-semibold">
                    {migrationResult.success ? "Migration réussie" : "Migration terminée avec des erreurs"}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{migrationResult.migratedFiles}</div>
                    <div className="text-xs text-muted-foreground">Fichiers migrés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{migrationResult.updatedProducts}</div>
                    <div className="text-xs text-muted-foreground">Produits mis à jour</div>
                  </div>
                </div>

                {migrationResult.errors.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 text-red-600">
                      Erreurs ({migrationResult.errors.length}):
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {migrationResult.errors.slice(0, 10).map((error: string, index: number) => (
                        <div key={index} className="text-xs text-red-700 bg-red-100 p-2 rounded">
                          {error}
                        </div>
                      ))}
                      {migrationResult.errors.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          ... et {migrationResult.errors.length - 10} autres erreurs
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductImagesMigrationTool;
