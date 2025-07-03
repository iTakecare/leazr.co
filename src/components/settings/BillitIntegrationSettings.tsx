import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Key, Globe, TestTube, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { setupBillitIntegration, disableBillitIntegration, getBillitIntegration, testBillitIntegration } from "@/services/invoiceService";
import { toast } from "sonner";

const BillitIntegrationSettings = () => {
  const { companyId } = useMultiTenant();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    baseUrl: "",
    companyId: "",
    leaserEmail: "",
    supplierName: "",
    supplierEmail: "",
    supplierPhone: ""
  });

  useEffect(() => {
    loadIntegration();
  }, [companyId]);

  const loadIntegration = async () => {
    if (!companyId) return;
    
    try {
      const data = await getBillitIntegration(companyId);
      if (data) {
        setIntegration(data);
        setFormData({
          apiKey: data.api_credentials?.apiKey || "",
          baseUrl: data.api_credentials?.baseUrl || "",
          companyId: data.api_credentials?.companyId || "",
          leaserEmail: data.settings?.leaser_email || "",
          supplierName: data.settings?.supplier_contact?.name || "",
          supplierEmail: data.settings?.supplier_contact?.email || "",
          supplierPhone: data.settings?.supplier_contact?.phone || ""
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'intégration:", error);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    
    if (!formData.apiKey || !formData.baseUrl || !formData.companyId) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      await setupBillitIntegration(
        companyId,
        formData.apiKey,
        formData.baseUrl,
        formData.companyId,
        { 
          leaser_email: formData.leaserEmail,
          supplier_contact: {
            name: formData.supplierName,
            email: formData.supplierEmail,
            phone: formData.supplierPhone
          }
        }
      );
      
      toast.success("Configuration Billit sauvegardée");
      await loadIntegration();
      // Effacer les résultats de test après sauvegarde
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
      await disableBillitIntegration(companyId);
      toast.success("Intégration Billit désactivée");
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
      console.log("🧪 Démarrage test intégration Billit...");
      const results = await testBillitIntegration(companyId);
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
            <Building2 className="h-5 w-5" />
            Intégration Billit
          </CardTitle>
          <CardDescription>
            Configurez l'intégration avec Billit pour la génération automatique de factures
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
                Clé API Billit *
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Votre clé API Billit"
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
                  // Ajouter automatiquement https:// si manquant
                  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                  }
                  setFormData(prev => ({ ...prev, baseUrl: url }));
                }}
                placeholder="https://api.billit.be/v1"
              />
              <p className="text-xs text-muted-foreground">
                L'URL doit commencer par https://
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">
                ID de votre entreprise Billit *
              </Label>
              <Input
                id="companyId"
                value={formData.companyId}
                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                placeholder="123456 (ID numérique uniquement)"
              />
              <p className="text-xs text-muted-foreground">
                Utilisez votre ID numérique d'entreprise Billit, pas votre email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaserEmail">
                Email du bailleur (optionnel)
              </Label>
              <Input
                id="leaserEmail"
                type="email"
                value={formData.leaserEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, leaserEmail: e.target.value }))}
                placeholder="email@bailleur.com"
              />
            </div>

            {/* Section Contact Fournisseur */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Contact Fournisseur (pour les factures)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">
                    Nom du contact
                  </Label>
                  <Input
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplierEmail">
                    Email du contact
                  </Label>
                  <Input
                    id="supplierEmail"
                    type="email"
                    value={formData.supplierEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                    placeholder="contact@entreprise.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="supplierPhone">
                    Téléphone du contact
                  </Label>
                  <Input
                    id="supplierPhone"
                    type="tel"
                    value={formData.supplierPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                    placeholder="+32 2 123 45 67"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ces informations apparaîtront dans les factures Billit comme contact du fournisseur
              </p>
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
                            <div className={`w-3 h-3 rounded-full ${testResults.results.company_access ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span>Accès company</span>
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
          <CardTitle>Guide d'intégration Billit</CardTitle>
          <CardDescription>
            Comment obtenir vos identifiants API Billit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              <strong>Étapes pour obtenir l'accès à l'API Billit :</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Contactez Billit à support@billit.be</li>
                <li>Demandez l'accès développeur et la documentation API</li>
                <li>Précisez que vous souhaitez intégrer la génération de factures</li>
                <li>Récupérez votre API Key, l'URL de base et votre Company ID</li>
                <li>Configurez ces informations dans ce formulaire</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Informations à demander à Billit :</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>API Key</strong> : Votre clé d'authentification</li>
              <li>• <strong>URL de base</strong> : L'endpoint de l'API (ex: https://api.billit.be/v1)</li>
              <li>• <strong>Company ID</strong> : L'identifiant unique de votre entreprise</li>
              <li>• <strong>Documentation API</strong> : Pour les spécificités techniques</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillitIntegrationSettings;