import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Shield, Key, Globe, TestTube, CheckCircle, XCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { setupCompanyWebIntegration, disableCompanyWebIntegration, getCompanyWebIntegration, testCompanyWebIntegration } from "@/services/invoiceService";
import { toast } from "sonner";

const CompanyWebIntegrationSettings = () => {
  const { companyId } = useMultiTenant();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    baseUrl: "https://api.companyweb.be",
    testMode: false,
    autoVerification: false,
    alertThreshold: 50,
    dataEnrichment: {
      address: true,
      vat: true,
      financial: false,
      legal: true
    }
  });

  useEffect(() => {
    loadIntegration();
  }, [companyId]);

  const loadIntegration = async () => {
    if (!companyId) return;
    
    try {
      const data = await getCompanyWebIntegration(companyId);
      if (data) {
        setIntegration(data);
        setFormData({
          apiKey: data.api_credentials?.apiKey || "",
          baseUrl: data.api_credentials?.baseUrl || "https://api.companyweb.be",
          testMode: data.api_credentials?.testMode || false,
          autoVerification: data.settings?.auto_verification || false,
          alertThreshold: data.settings?.alert_threshold || 50,
          dataEnrichment: {
            address: data.settings?.data_enrichment?.address || true,
            vat: data.settings?.data_enrichment?.vat || true,
            financial: data.settings?.data_enrichment?.financial || false,
            legal: data.settings?.data_enrichment?.legal || true
          }
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'intégration:", error);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    
    if (!formData.apiKey || !formData.baseUrl) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      await setupCompanyWebIntegration(
        companyId,
        formData.apiKey,
        formData.baseUrl,
        formData.testMode,
        { 
          auto_verification: formData.autoVerification,
          alert_threshold: formData.alertThreshold,
          data_enrichment: formData.dataEnrichment
        }
      );
      
      toast.success("Configuration CompanyWeb sauvegardée");
      await loadIntegration();
      setTestResults(null);
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      await disableCompanyWebIntegration(companyId);
      toast.success("Intégration CompanyWeb désactivée");
      await loadIntegration();
    } catch (error: any) {
      console.error("Erreur lors de la désactivation:", error);
      toast.error(error.message || "Erreur lors de la désactivation");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!companyId) {
      toast.error("Company ID manquant");
      return;
    }

    setTesting(true);
    setTestResults(null);
    
    try {
      console.log("🧪 Démarrage test intégration CompanyWeb...");
      const results = await testCompanyWebIntegration(companyId);
      setTestResults(results);
      
      if (results.success) {
        toast.success("✅ Test de l'intégration réussi !");
      } else {
        toast.error("❌ Problèmes détectés avec l'intégration");
      }
    } catch (error: any) {
      console.error("Erreur lors du test:", error);
      toast.error("Erreur lors du test de l'intégration");
      setTestResults({
        success: false,
        message: "Erreur lors du test",
        results: { errors: [error.message] }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Intégration CompanyWeb
          </CardTitle>
          <CardDescription>
            Configurez l'intégration avec CompanyWeb pour la vérification de solvabilité et l'enrichissement de données clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {integration?.is_enabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {integration?.is_enabled ? "Activée" : "Désactivée"}
              </span>
            </div>
            {integration?.is_enabled && (
              <Badge variant="default">Configurée</Badge>
            )}
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Clé API CompanyWeb *
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Votre clé API CompanyWeb"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                URL de base de l'API *
              </Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => {
                  let url = e.target.value;
                  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                  }
                  setFormData(prev => ({ ...prev, baseUrl: url }));
                }}
                placeholder="https://api.companyweb.be"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="testMode"
                checked={formData.testMode}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, testMode: checked }))}
              />
              <Label htmlFor="testMode">Mode test (sandbox)</Label>
            </div>

            {/* Paramètres de vérification */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Paramètres de vérification
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoVerification"
                    checked={formData.autoVerification}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoVerification: checked }))}
                  />
                  <Label htmlFor="autoVerification">Vérification automatique des nouveaux clients</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alertThreshold">
                    Seuil d'alerte de solvabilité (0-100)
                  </Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) || 50 }))}
                    placeholder="50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Score en-dessous duquel déclencher une alerte de risque
                  </p>
                </div>
              </div>
            </div>

            {/* Enrichissement de données */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Données à enrichir automatiquement</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enrichAddress"
                    checked={formData.dataEnrichment.address}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      dataEnrichment: { ...prev.dataEnrichment, address: checked }
                    }))}
                  />
                  <Label htmlFor="enrichAddress">Adresse complète</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enrichVat"
                    checked={formData.dataEnrichment.vat}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      dataEnrichment: { ...prev.dataEnrichment, vat: checked }
                    }))}
                  />
                  <Label htmlFor="enrichVat">Numéro de TVA</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enrichLegal"
                    checked={formData.dataEnrichment.legal}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      dataEnrichment: { ...prev.dataEnrichment, legal: checked }
                    }))}
                  />
                  <Label htmlFor="enrichLegal">Informations légales</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enrichFinancial"
                    checked={formData.dataEnrichment.financial}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      dataEnrichment: { ...prev.dataEnrichment, financial: checked }
                    }))}
                  />
                  <Label htmlFor="enrichFinancial">Données financières</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Résultats du test */}
          {testResults && (
            <Alert className={`${testResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                {testResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="font-medium mb-2">{testResults.message}</div>
                    
                    {testResults.results && (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${testResults.results.integration_found ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span>Intégration trouvée</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${testResults.results.integration_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span>Intégration activée</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${testResults.results.has_credentials ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span>Credentials configurées</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${testResults.results.auth_test ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span>Authentification</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${testResults.results.api_test ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span>API fonctionnelle</span>
                          </div>
                        </div>
                        
                        {testResults.results.warnings && testResults.results.warnings.length > 0 && (
                          <div className="mt-3 p-3 bg-yellow-100 rounded-md">
                            <div className="font-medium text-yellow-800 mb-1">Avertissements:</div>
                            <ul className="list-disc list-inside space-y-1 text-yellow-700 text-xs">
                              {testResults.results.warnings.map((warning: string, index: number) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {testResults.results.errors && testResults.results.errors.length > 0 && (
                          <div className="mt-3 p-3 bg-red-100 rounded-md">
                            <div className="font-medium text-red-800 mb-1">Erreurs détectées:</div>
                            <ul className="list-disc list-inside space-y-1 text-red-700 text-xs">
                              {testResults.results.errors.map((error: string, index: number) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleTest} 
              disabled={testing || !formData.apiKey || !formData.baseUrl}
              variant="outline"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? "Test en cours..." : "Tester l'intégration"}
            </Button>
            
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
            
            {integration?.is_enabled && (
              <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                Désactiver
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guide d'intégration */}
      <Card>
        <CardHeader>
          <CardTitle>Guide d'intégration CompanyWeb</CardTitle>
          <CardDescription>
            Comment obtenir vos identifiants API CompanyWeb
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              <strong>Étapes pour obtenir l'accès à l'API CompanyWeb :</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Visitez le site CompanyWeb.be</li>
                <li>Contactez leur équipe commerciale</li>
                <li>Souscrivez à un plan incluant l'accès API</li>
                <li>Récupérez votre clé API depuis votre tableau de bord</li>
                <li>Configurez l'intégration dans ce formulaire</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Fonctionnalités disponibles :</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Vérification de solvabilité</strong> : Score de risque client</li>
              <li>• <strong>Enrichissement automatique</strong> : Données entreprise complètes</li>
              <li>• <strong>Alertes risque</strong> : Notifications pour clients à risque</li>
              <li>• <strong>Validation TVA</strong> : Vérification numéros de TVA</li>
              <li>• <strong>Suivi financier</strong> : Monitoring situation financière</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyWebIntegrationSettings;