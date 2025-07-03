import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Key, Globe, TestTube, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { setupBillitIntegration, disableBillitIntegration, getBillitIntegration } from "@/services/invoiceService";
import { toast } from "sonner";

const BillitIntegrationSettings = () => {
  const { companyId } = useMultiTenant();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    baseUrl: "",
    companyId: "",
    leaserEmail: ""
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
          leaserEmail: data.settings?.leaser_email || ""
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
        { leaser_email: formData.leaserEmail }
      );
      
      toast.success("Configuration Billit sauvegardée");
      await loadIntegration();
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
    if (!formData.apiKey || !formData.baseUrl) {
      toast.error("Veuillez d'abord configurer l'API Key et l'URL de base");
      return;
    }

    setTesting(true);
    try {
      // Test simple de connexion à l'API Billit
      const response = await fetch(`${formData.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${formData.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success("Connexion à l'API Billit réussie !");
      } else {
        toast.error(`Erreur de connexion: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error("Erreur lors du test:", error);
      toast.error("Impossible de se connecter à l'API Billit");
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
                onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.billit.be/v1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">
                ID de votre entreprise Billit *
              </Label>
              <Input
                id="companyId"
                value={formData.companyId}
                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                placeholder="Votre Company ID Billit"
              />
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
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleTest} 
              disabled={testing || !formData.apiKey || !formData.baseUrl}
              variant="outline"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? "Test en cours..." : "Tester la connexion"}
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