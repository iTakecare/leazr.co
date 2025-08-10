import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Key, 
  Copy, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Code, 
  Play, 
  BookOpen,
  Settings,
  Database,
  Zap,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useApiKeys } from "@/hooks/useApiKeys";

const CatalogApiSettings = () => {
  const { companyId } = useMultiTenant();
  const { apiKeys, loading, createApiKey, deleteApiKey, updateApiKey } = useApiKeys();
  const [showApiKey, setShowApiKey] = React.useState<string | null>(null);
  const [testEndpoint, setTestEndpoint] = React.useState('products');
  const [testApiKey, setTestApiKey] = React.useState('');
  const [testResult, setTestResult] = React.useState<any>(null);
  const [testLoading, setTestLoading] = React.useState(false);

  const baseApiUrl = `${window.location.origin}/functions/v1/catalog-api/v1/${companyId}`;

  const handleCreateApiKey = async () => {
    const keyName = prompt("Nom de la clé API:");
    if (!keyName) return;

    try {
      await createApiKey(keyName);
      toast.success("Clé API créée avec succès");
    } catch (error) {
      toast.error("Erreur lors de la création de la clé API");
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette clé API ?")) return;
    
    try {
      await deleteApiKey(keyId);
      toast.success("Clé API supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast.success("Clé API copiée !");
  };

  const copyEndpoint = (endpoint: string) => {
    navigator.clipboard.writeText(`${baseApiUrl}/${endpoint}`);
    toast.success("URL copiée !");
  };

  const downloadDocumentation = async () => {
    try {
      const response = await fetch('/catalog-api-documentation.txt');
      if (!response.ok) {
        throw new Error('Fichier de documentation non trouvé');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'catalog-api-documentation.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Documentation téléchargée avec succès");
    } catch (error) {
      toast.error("Erreur lors du téléchargement de la documentation");
    }
  };

  const testApi = async () => {
    if (!testApiKey) {
      toast.error("Veuillez sélectionner une clé API");
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch(`${baseApiUrl}/${testEndpoint}`, {
        headers: {
          'x-api-key': testApiKey,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setTestResult({
        status: response.status,
        data: data
      });
    } catch (error) {
      setTestResult({
        status: 'error',
        data: { error: error.message }
      });
    } finally {
      setTestLoading(false);
    }
  };

  const endpoints = [
    {
      method: 'GET',
      path: 'company',
      description: 'Informations de l\'entreprise et personnalisations',
      example: '{ "company": { "name": "...", "logo_url": "..." }, "customizations": {...} }'
    },
    {
      method: 'GET', 
      path: 'products',
      description: 'Liste des produits avec filtrage et pagination',
      params: '?category=electronics&brand=apple&page=1&limit=20',
      example: '{ "products": [...], "pagination": { "page": 1, "limit": 20 } }'
    },
    {
      method: 'GET',
      path: 'products/{id}',
      description: 'Détail d\'un produit spécifique',
      example: '{ "product": { "id": "...", "name": "...", "price": 100 } }'
    },
    {
      method: 'GET',
      path: 'products/{id}/variants',
      description: 'Variants d\'un produit (couleurs, tailles, etc.)',
      example: '{ "variants": [{ "attributes": {"color": "red"}, "price": 110 }] }'
    },
    {
      method: 'GET',
      path: 'products/{id}/related',
      description: 'Produits associés/recommandés',
      example: '{ "products": [...] }'
    },
    {
      method: 'GET',
      path: 'products/{id}/co2',
      description: 'Impact environnemental du produit',
      example: '{ "co2_impact": { "value": 2.5, "unit": "kg CO2eq" } }'
    },
    {
      method: 'GET',
      path: 'categories',
      description: 'Liste des catégories avec traductions',
      example: '{ "categories": [{ "name": "electronics", "translation": "Électronique" }] }'
    },
    {
      method: 'GET',
      path: 'brands',
      description: 'Liste des marques avec métadonnées',
      example: '{ "brands": [{ "name": "apple", "website_url": "..." }] }'
    },
    {
      method: 'GET',
      path: 'packs',
      description: 'Liste des packs de produits',
      example: '{ "packs": [...] }'
    },
    {
      method: 'GET',
      path: 'packs/{id}',
      description: 'Détail d\'un pack spécifique',
      example: '{ "pack": { "id": "...", "name": "...", "items": [...] } }'
    },
    {
      method: 'GET',
      path: 'search',
      description: 'Recherche dans le catalogue',
      params: '?q=ordinateur',
      example: '{ "products": [...] }'
    },
    {
      method: 'GET',
      path: 'environmental',
      description: 'Données environnementales globales',
      example: '{ "environmental": { "co2_saved": 1000, "devices_count": 500 } }'
    },
    {
      method: 'GET',
      path: 'settings',
      description: 'Configuration d\'affichage du catalogue',
      example: '{ "settings": { "header_enabled": true, "header_title": "..." } }'
    },
    {
      method: 'GET',
      path: 'customizations',
      description: 'Personnalisations visuelles complètes',
      example: '{ "customizations": { "primary_color": "#3b82f6", ... } }'
    }
  ];

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Testeur
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <div className="space-y-6">
            {/* Gestion des clés API */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Clés API
                    </CardTitle>
                    <CardDescription>
                      Gérez les clés d'accès pour l'API JSON de votre catalogue
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateApiKey}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une clé
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiKeys?.map((key: any) => (
                    <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{key.name}</h4>
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={showApiKey === key.id ? key.api_key : '•'.repeat(32)}
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                          >
                            {showApiKey === key.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyApiKey(key.api_key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Créée le {new Date(key.created_at).toLocaleDateString()} 
                          {key.last_used_at && ` • Dernière utilisation: ${new Date(key.last_used_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteApiKey(key.id)}
                        className="ml-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {(!apiKeys || apiKeys.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune clé API créée</p>
                      <p className="text-sm">Créez votre première clé pour commencer à utiliser l'API</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* URL de base */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  URL de base de l'API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input readOnly value={baseApiUrl} className="font-mono text-sm" />
                  <Button size="sm" variant="outline" onClick={() => copyEndpoint('')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Ajoutez l'en-tête <code>x-api-key: VOTRE_CLE</code> à toutes vos requêtes
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Documentation des endpoints
                  </CardTitle>
                  <CardDescription>
                    Liste complète des endpoints disponibles avec exemples
                  </CardDescription>
                </div>
                <Button onClick={downloadDocumentation} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger la doc complète
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{endpoint.method}</Badge>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {endpoint.path}
                          {endpoint.params && <span className="text-muted-foreground">{endpoint.params}</span>}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyEndpoint(endpoint.path)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{endpoint.description}</p>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Exemple de réponse:</p>
                      <pre className="text-xs font-mono overflow-x-auto">
                        {endpoint.example}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Testeur d'API
              </CardTitle>
              <CardDescription>
                Testez vos endpoints directement depuis l'interface d'administration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Endpoint à tester</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={testEndpoint}
                    onChange={(e) => setTestEndpoint(e.target.value)}
                  >
                    {endpoints.map((endpoint, index) => (
                      <option key={index} value={endpoint.path.replace(/{[^}]+}/g, 'test-id')}>
                        {endpoint.method} {endpoint.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Clé API</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={testApiKey}
                    onChange={(e) => setTestApiKey(e.target.value)}
                  >
                    <option value="">Sélectionner une clé</option>
                    {apiKeys?.map((key: any) => (
                      <option key={key.id} value={key.api_key}>
                        {key.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button onClick={testApi} disabled={testLoading || !testApiKey} className="w-full">
                {testLoading ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Tester l'endpoint
                  </>
                )}
              </Button>

              {testResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Résultat du test</Label>
                    <Badge variant={testResult.status === 200 ? "default" : "destructive"}>
                      Status: {testResult.status}
                    </Badge>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CatalogApiSettings;