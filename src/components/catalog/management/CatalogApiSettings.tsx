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
import { getCompanySlugForUser } from "@/services/companySlugService";

const CatalogApiSettings = () => {
  const { companyId } = useMultiTenant();
  const { apiKeys, loading, createApiKey, deleteApiKey, updateApiKey } = useApiKeys();
  const [showApiKey, setShowApiKey] = React.useState<string | null>(null);
  const [testEndpoint, setTestEndpoint] = React.useState('products');
  const [testApiKey, setTestApiKey] = React.useState('');
  const [testResult, setTestResult] = React.useState<any>(null);
  const [testLoading, setTestLoading] = React.useState(false);
  const [companySlug, setCompanySlug] = React.useState<string | null>(null);

  // Get company slug on component mount
  React.useEffect(() => {
    const fetchCompanySlug = async () => {
      const slug = await getCompanySlugForUser();
      setCompanySlug(slug);
    };
    fetchCompanySlug();
  }, []);

  const baseApiUrl = companySlug 
    ? `https://cifbetjefyfocafanlhv.supabase.co/functions/v1/catalog-api/v1/${companySlug}`
    : '';

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

  const catalogFiles = [
    {
      category: "Configuration",
      files: [
        { name: "types-catalog.txt", description: "Types TypeScript pour produits, panier et catalogue" },
        { name: "api-config.txt", description: "Configuration pour appeler l'API Leazr" },
        { name: "utils-pricing.txt", description: "Utilitaires de calcul de prix" }
      ]
    },
    {
      category: "Services API", 
      files: [
        { name: "api-service.txt", description: "Service pour appeler l'API catalogue Leazr" },
        { name: "hooks-products.txt", description: "Hooks React pour récupérer les données via API" }
      ]
    },
    {
      category: "Contextes React",
      files: [
        { name: "cart-context.txt", description: "Contexte du panier avec localStorage (sans branding)" },
        { name: "company-context.txt", description: "Contexte entreprise simplifié" }
      ]
    },
    {
      category: "Hooks et filtres",
      files: [
        { name: "hook-simplified-filter.txt", description: "Hook pour les filtres du catalogue public" }
      ]
    },
    {
      category: "Composants de navigation",
      files: [
        { name: "navigation-bar-clean.txt", description: "Barre de navigation neutre pour le catalogue" },
        { name: "filter-bar-clean.txt", description: "Barre de filtres sans éléments de branding" }
      ]
    },
    {
      category: "Composants de produits",
      files: [
        { name: "product-grid.txt", description: "Grille de produits" },
        { name: "product-card.txt", description: "Carte produit individuelle" }
      ]
    },
    {
      category: "Pages principales",
      files: [
        { name: "catalog-page.txt", description: "Page principale du catalogue anonyme" },
        { name: "cart-page.txt", description: "Page du panier" }
      ]
    },
    {
      category: "Guide et dépendances",
      files: [
        { name: "integration-guide.txt", description: "Guide d'intégration complet" },
        { name: "dependencies.txt", description: "Liste des dépendances NPM nécessaires" }
      ]
    }
  ];

  const downloadFile = async (filename: string) => {
    try {
      const response = await fetch(`/catalog-skeleton/${filename}`);
      if (!response.ok) {
        throw new Error(`Fichier ${filename} non trouvé`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`${filename} téléchargé avec succès`);
    } catch (error) {
      toast.error(`Erreur lors du téléchargement de ${filename}`);
    }
  };

  const downloadAllFiles = async () => {
    try {
      // Create a zip file with all catalog skeleton files
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add all files to zip
      for (const category of catalogFiles) {
        for (const file of category.files) {
          try {
            const response = await fetch(`/catalog-skeleton/${file.name}`);
            if (response.ok) {
              const content = await response.text();
              zip.file(file.name, content);
            }
          } catch (error) {
            console.warn(`Could not add ${file.name} to zip:`, error);
          }
        }
      }

      // Generate and download zip
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'catalog-skeleton-files.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Tous les fichiers téléchargés avec succès");
    } catch (error) {
      toast.error("Erreur lors du téléchargement groupé");
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

  if (loading || !companySlug) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="download" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Télécharger
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
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-4">
                <p className="text-sm text-blue-700">
                  <strong>URL de base:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">{baseApiUrl}</code><br/>
                  <strong>Note:</strong> L'API utilise le slug de l'entreprise ({companySlug}) dans l'URL au lieu de l'UUID pour une meilleure lisibilité.
                </p>
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

        <TabsContent value="download">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Fichiers du catalogue
                  </CardTitle>
                  <CardDescription>
                    Téléchargez les fichiers squelette pour intégrer le catalogue sur votre site
                  </CardDescription>
                </div>
                <Button onClick={downloadAllFiles} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger tout (ZIP)
                </Button>
              </div>
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
                <p className="text-sm text-green-700">
                  <strong>Archive complète :</strong> Tous les fichiers nécessaires pour l'intégration du catalogue iTakecare via l'API Leazr.<br/>
                  <strong>Note :</strong> Ces fichiers sont conçus pour être intégrés dans un projet React/TypeScript existant.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {catalogFiles.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">{category.category}</h3>
                    <div className="grid gap-4">
                      {category.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{file.name}</h4>
                            <p className="text-xs text-muted-foreground">{file.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadFile(file.name)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Instructions d'intégration</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Ces fichiers contiennent tout le code nécessaire pour intégrer un catalogue de produits
                      sur le site iTakecare en utilisant l'API Leazr. Chaque fichier est documenté et prêt à être copié-collé.
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>Types et configuration :</strong> Définissent les structures de données et la configuration API</li>
                      <li>• <strong>Services et hooks :</strong> Gèrent les appels API et l'état des composants</li>
                      <li>• <strong>Contextes :</strong> Partagent l'état du panier et des données entreprise</li>
                      <li>• <strong>Composants :</strong> Interface utilisateur complète pour navigation et affichage produits</li>
                      <li>• <strong>Pages :</strong> Pages principales du catalogue et du panier</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CatalogApiSettings;