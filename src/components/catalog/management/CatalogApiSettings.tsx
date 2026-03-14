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
  const [testMethod, setTestMethod] = React.useState<'GET' | 'PATCH'>('GET');
  const [testBody, setTestBody] = React.useState('');
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
      const fetchOptions: RequestInit = {
        method: testMethod,
        headers: {
          'x-api-key': testApiKey,
          'Content-Type': 'application/json'
        }
      };

      if (testMethod === 'PATCH' && testBody) {
        try {
          fetchOptions.body = testBody;
        } catch (e) {
          toast.error("Le body JSON est invalide");
          setTestLoading(false);
          return;
        }
      }

      const response = await fetch(`${baseApiUrl}/${testEndpoint}`, fetchOptions);

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

  interface Endpoint {
    method: 'GET' | 'PATCH' | 'POST' | 'DELETE';
    path: string;
    description: string;
    params?: string;
    body?: string;
    example: string;
  }

  const endpoints: Endpoint[] = [
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
      description: 'Variants et combinaisons de prix d\'un produit',
      example: '{ "variants": [{ "id": "var_123", "product_id": "prod_123", "attributes": { "color": "red", "size": "large" }, "price": 299.99, "monthly_price": 25.99, "stock": 10 }] }'
    },
    {
      method: 'GET',
      path: 'products/{id}/related',
      description: 'Produits associés de la même catégorie',
      example: '{ "products": [{ "id": "prod_456", "name": "Laptop similaire", "price": 899, "category": { "name": "laptop", "translation": "Ordinateurs portables" }, "brand": { "name": "Dell", "translation": "Dell" } }] }'
    },
    {
      method: 'GET',
      path: 'products/{id}/co2',
      description: 'Données CO2 d\'un produit spécifique',
      example: '{ "co2_impact": { "value": 170, "unit": "kg CO2eq", "calculation_date": "2024-01-15T10:30:00Z", "category": { "name": "laptop", "translation": "Ordinateurs portables" }, "carbon_footprint_reduction_percentage": 15, "energy_savings_kwh": 200, "source_url": "https://impactco2.fr" } }'
    },
    {
      method: 'GET',
      path: 'products/{id}/suppliers',
      description: 'Prix par fournisseur pour un produit avec SKU et date de mise à jour',
      example: '{ "supplier_prices": [{ "supplier": { "id": "sup_123", "name": "AFB", "code": "AFB" }, "purchase_price": 899.99, "sku": "AFB-MBP14-M3", "last_price_update": "2025-12-29T10:00:00Z", "is_preferred": true }] }'
    },
    {
      method: 'PATCH',
      path: 'products/{id}/purchase-price',
      description: 'Mettre à jour le prix d\'achat d\'un produit (permission: products_write)',
      body: '{ "purchase_price": 899.99, "supplier_id": "uuid", "sku": "SKU-FOURNISSEUR" }',
      example: '{ "success": true, "product_id": "uuid", "purchase_price": 899.99, "updated_at": "2025-12-29T10:00:00Z" }'
    },
    {
      method: 'GET',
      path: 'environmental/categories',
      description: 'Données environnementales détaillées par catégorie',
      example: '{ "environmental_categories": [{ "id": "env_123", "category": { "id": "cat_456", "name": "laptop", "translation": "Ordinateurs portables" }, "co2_savings_kg": 170, "carbon_footprint_reduction_percentage": 15, "energy_savings_kwh": 200, "water_savings_liters": 50, "waste_reduction_kg": 5, "source_url": "https://impactco2.fr", "last_updated": "2024-01-15T10:30:00Z" }] }'
    },
    {
      method: 'GET',
      path: 'categories',
      description: 'Liste des catégories avec données environnementales intégrées',
      example: '{ "categories": [{ "id": "cat_456", "name": "laptop", "translation": "Ordinateurs portables", "company_id": "comp_789", "co2_savings_kg": 170, "environmental_impact": { "co2_savings_kg": 170, "carbon_footprint_reduction_percentage": 15, "energy_savings_kwh": 200, "source_url": "https://impactco2.fr", "last_updated": "2024-01-15T10:30:00Z" } }] }'
    },
    {
      method: 'GET',
      path: 'brands',
      description: 'Liste des marques avec traductions',
      example: '{ "brands": [{ "id": "brand_123", "name": "Dell", "translation": "Dell", "logo": "https://...", "description": "Fabricant d\'ordinateurs" }] }'
    },
    {
      method: 'GET',
      path: 'packs',
      description: 'Liste des packs de produits disponibles',
      example: '{ "packs": [{ "id": "pack_123", "name": "Pack Bureau Complet", "is_active": true, "company_id": "comp_789", "created_at": "2024-01-15T10:30:00Z" }] }'
    },
    {
      method: 'GET',
      path: 'packs/{id}',
      description: 'Détails d\'un pack spécifique',
      example: '{ "pack": { "id": "pack_123", "name": "Pack Bureau Complet", "description": "Pack complet pour équiper un bureau", "is_active": true, "total_price": 1299.99, "items": [...] } }'
    },
    {
      method: 'GET',
      path: 'search',
      description: 'Recherche dans le catalogue par nom ou description',
      params: '?q=ordinateur',
      example: '{ "products": [{ "id": "prod_123", "name": "Laptop Dell", "description": "Ordinateur portable professionnel", "category": { "name": "laptop", "translation": "Ordinateurs portables" }, "brand": { "name": "Dell", "translation": "Dell" } }] }'
    },
    {
      method: 'GET',
      path: 'environmental',
      description: 'Données environnementales globales de l\'entreprise',
      example: '{ "environmental": { "co2_saved": 15000, "devices_count": 1250 } }'
    },
    {
      method: 'GET',
      path: 'settings',
      description: 'Paramètres de configuration du catalogue public',
      example: '{ "settings": { "header_enabled": true, "header_title": "Notre Catalogue", "header_description": "Découvrez nos produits reconditionnés", "header_background_type": "gradient", "header_background_config": { "colors": ["#FF0000", "#0000FF"] } } }'
    },
    {
      method: 'GET',
      path: 'customizations',
      description: 'Toutes les personnalisations visuelles de l\'entreprise',
      example: '{ "customizations": { "company_name": "Mon Entreprise", "logo_url": "https://...", "primary_color": "#FF0000", "header_enabled": true, "header_title": "Catalogue Public", "iframe_width": "100%", "iframe_height": "600px", "quote_request_url": "https://..." } }'
    },
    {
      method: 'GET',
      path: 'suppliers',
      description: 'Liste des fournisseurs de l\'entreprise (permission: suppliers)',
      example: '{ "suppliers": [{ "id": "sup_123", "name": "AFB", "code": "AFB", "email": "contact@afb.fr", "is_active": true }] }'
    },
    {
      method: 'GET',
      path: 'suppliers/{id}',
      description: 'Détails d\'un fournisseur spécifique (permission: suppliers)',
      example: '{ "supplier": { "id": "sup_123", "name": "AFB", "code": "AFB", "email": "contact@afb.fr", "phone": "+33...", "website": "https://afb.fr", "is_active": true } }'
    },
    {
      method: 'PATCH',
      path: 'variants/{id}/purchase-price',
      description: 'Mettre à jour le prix d\'achat d\'une variante (permission: products_write)',
      body: '{ "purchase_price": 799.99, "supplier_id": "uuid", "sku": "SKU-VARIANT" }',
      example: '{ "success": true, "variant_id": "uuid", "purchase_price": 799.99, "updated_at": "2025-12-29T10:00:00Z" }'
    },
    {
      method: 'GET',
      path: 'partners',
      description: 'Liste des partenaires actifs',
      example: '{ "partners": [{ "id": "uuid", "name": "Partenaire A", "slug": "partenaire-a", "logo_url": "https://...", "is_active": true }] }'
    },
    {
      method: 'GET',
      path: 'partners/{slug}',
      description: 'Détail d\'un partenaire par slug ou ID',
      example: '{ "partner": { "id": "uuid", "name": "Partenaire A", "slug": "partenaire-a", "description": "...", "logo_url": "https://...", "website_url": "https://..." } }'
    },
    {
      method: 'GET',
      path: 'partners/{slug}/packs',
      description: 'Packs exclusifs avec options enrichies. allowed_product_ids contient des variant price IDs (UUIDs de product_variant_prices). L\'API filtre intelligemment : seuls les produits ayant au moins une variante sélectionnée apparaissent dans allowed_products, avec uniquement les variantes autorisées.',
      example: '{ "partner_packs": [{ "id": "uuid", "position": 0, "is_customizable": true, "pack": { "name": "Pack Pro", "total_monthly_price": 89.99, "items": [...] }, "options": [{ "category_name": "Tablettes", "is_required": false, "max_quantity": 2, "allowed_products": [{ "id": "uuid", "name": "iPad Air M2", "monthly_price": 19.99, "product_variant_prices": [...] }] }] }] }'
    },
    {
      method: 'GET',
      path: 'partners/{slug}/providers',
      description: 'Prestataires externes liés au partenaire avec leurs produits',
      example: '{ "provider_cards": [{ "id": "uuid", "card_title": "Téléphonie", "provider": { "name": "Proximus", "logo_url": "..." }, "products": [...] }] }'
    },
    {
      method: 'GET',
      path: 'providers',
      description: 'Liste des prestataires externes actifs',
      example: '{ "providers": [{ "id": "uuid", "name": "Proximus", "logo_url": "https://...", "description": "Opérateur télécom", "is_active": true }] }'
    },
    {
      method: 'GET',
      path: 'providers/{id}/products',
      description: 'Produits/services d\'un prestataire externe',
      example: '{ "products": [{ "id": "uuid", "name": "Abonnement mobile", "price_htva": 9.99, "billing_period": "monthly", "is_active": true }] }'
    },
    {
      method: 'POST',
      path: 'create-product-request (Edge Function)',
      description: 'Créer une demande de devis/commande. Supporte les champs partenaire et services externes.',
      body: '{\n  "products": [{ "product_id": "uuid", "variant_id": "uuid", "quantity": 2, "unit_price": 25.99 }],\n  "contact_info": { "first_name": "Jean", "last_name": "Dupont", "email": "jean@example.com" },\n  "company_info": { "company_name": "Acme SA", "vat_number": "BE0123456789" },\n  "partner_slug": "the-pod",\n  "partner_name": "The Pod",\n  "external_services": [\n    { "provider_name": "Proximus", "product_name": "Mobile Pro", "price_htva": 9.99, "billing_period": "monthly", "quantity": 1 }\n  ]\n}',
      example: '{ "success": true, "request_id": "uuid", "message": "Demande créée avec succès" }'
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
                <h4 className="font-medium text-blue-900 mb-2">📌 Authentification et utilisation</h4>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>URL de base:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">{baseApiUrl}</code><br/>
                  <strong>Note:</strong> L'API utilise le slug de l'entreprise ({companySlug}) dans l'URL au lieu de l'UUID pour une meilleure lisibilité.
                </p>
                <p className="text-sm text-blue-700">
                  Toutes les requêtes doivent inclure l'en-tête <code className="bg-blue-100 px-1 py-0.5 rounded">x-api-key</code> avec votre clé API.
                </p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mt-4">
                <h4 className="font-medium text-gray-900 mb-2">📝 Paramètres de requête disponibles</h4>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>GET /products :</strong></p>
                  <ul className="ml-4 space-y-0.5 text-xs">
                    <li>• <code>page</code> - Numéro de page (défaut: 1)</li>
                    <li>• <code>limit</code> - Éléments par page (défaut: 50, max: 100)</li>
                    <li>• <code>category</code> - Filtrer par nom de catégorie</li>
                    <li>• <code>brand</code> - Filtrer par nom de marque</li>
                  </ul>
                  <p className="mt-2"><strong>GET /search :</strong></p>
                  <ul className="ml-4 space-y-0.5 text-xs">
                    <li>• <code>q</code> - Terme de recherche (nom ou description)</li>
                  </ul>
                  <p className="mt-2"><strong>Gestion des erreurs :</strong></p>
                  <ul className="ml-4 space-y-0.5 text-xs">
                    <li>• <code>401</code> - Clé API invalide ou manquante</li>
                    <li>• <code>404</code> - Endpoint ou ressource non trouvée</li>
                    <li>• <code>500</code> - Erreur serveur interne</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
                <h4 className="font-medium text-green-900 mb-2">🌱 Nouveaux endpoints environnementaux</h4>
                <p className="text-sm text-green-700 mb-2">
                  L'API inclut maintenant des données CO2 complètes avec équivalences automatiques :
                </p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• <strong>1 kg CO2 ≈ 6 km en voiture</strong> (calcul basé sur émissions moyennes)</li>
                  <li>• <strong>1 kg CO2 ≈ 20 kg absorbés par arbre/mois</strong> (capacité d'absorption moyenne)</li>
                  <li>• Sources : Base de données iTakecare + fallback impactco2.fr</li>
                  <li>• Données disponibles : économies eau, énergie, déchets selon la catégorie</li>
                </ul>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-4">
                <h4 className="font-medium text-amber-900 mb-2">✏️ Permissions d'écriture (API v2026.1)</h4>
                <p className="text-sm text-amber-700 mb-2">
                  Les endpoints PATCH nécessitent des permissions spécifiques dans votre clé API :
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• <code className="bg-amber-100 px-1 rounded">products_write</code> - Mise à jour des prix d'achat produits/variantes</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">suppliers</code> - Lecture des fournisseurs</li>
                  <li>• <code className="bg-amber-100 px-1 rounded">suppliers_write</code> - Gestion des fournisseurs</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg mt-4">
                <h4 className="font-medium text-purple-900 mb-2">🏭 Gestion des fournisseurs (v2026.1)</h4>
                <p className="text-sm text-purple-700 mb-2">
                  L'API permet maintenant de gérer les prix d'achat par fournisseur :
                </p>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• <strong>SKU fournisseur</strong> - Identifier précisément le matériel chez chaque fournisseur</li>
                  <li>• <strong>Prix par fournisseur</strong> - Comparer les prix d'achat entre fournisseurs</li>
                  <li>• <strong>Fournisseur préféré</strong> - Marquer le fournisseur principal via <code className="bg-purple-100 px-1 rounded">is_preferred</code></li>
                  <li>• <strong>Historique des mises à jour</strong> - Suivre les changements de prix via <code className="bg-purple-100 px-1 rounded">last_price_update</code></li>
                </ul>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mt-4">
                <h4 className="font-medium text-indigo-900 mb-2">🤝 Écosystème partenaires (v2026.1)</h4>
                <p className="text-sm text-indigo-700 mb-2">
                  L'API expose un écosystème complet pour les pages partenaires dédiées :
                </p>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• <strong>Pages partenaires</strong> - Landing pages dédiées avec packs exclusifs et prestataires</li>
                  <li>• <strong>Isolation catalogue</strong> - Les packs assignés à un partenaire sont masqués du catalogue public</li>
                  <li>• <strong>Packs personnalisables</strong> - Options par catégorie (tablette, périphérique...) avec choix de produits</li>
                  <li>• <strong>Prestataires externes</strong> - Services tiers (téléphonie, etc.) liés aux partenaires avec souscription directe</li>
                </ul>
              </div>
              
              <div className="bg-violet-50 border border-violet-200 p-3 rounded-lg mt-4">
                <h4 className="font-medium text-violet-900 mb-2">📦 Demandes partenaires & services externes (v2026.3)</h4>
                <p className="text-sm text-violet-700 mb-2">
                  L'endpoint <code className="bg-violet-100 px-1 rounded">create-product-request</code> supporte maintenant les champs partenaire et services externes :
                </p>
                <ul className="text-sm text-violet-700 space-y-1">
                  <li>• <code className="bg-violet-100 px-1 rounded">partner_slug</code> - Identifiant du partenaire (ex: "the-pod"). Définit le type comme <code>partner_request</code></li>
                  <li>• <code className="bg-violet-100 px-1 rounded">partner_name</code> - Nom d'affichage du partenaire (ex: "The Pod")</li>
                  <li>• <code className="bg-violet-100 px-1 rounded">external_services[]</code> - Services de prestataires externes sélectionnés par le client</li>
                  <li>• Chaque service : <code className="bg-violet-100 px-1 rounded">provider_name</code>, <code className="bg-violet-100 px-1 rounded">product_name</code>, <code className="bg-violet-100 px-1 rounded">price_htva</code>, <code className="bg-violet-100 px-1 rounded">billing_period</code> (monthly/yearly/one_time), <code className="bg-violet-100 px-1 rounded">quantity</code></li>
                </ul>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline"
                          className={endpoint.method === 'PATCH' ? 'bg-orange-100 text-orange-700 border-orange-300' : endpoint.method === 'POST' ? 'bg-green-100 text-green-700 border-green-300' : endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700 border-red-300' : ''}
                        >
                          {endpoint.method}
                        </Badge>
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
                    
                    {endpoint.body && (
                      <div className="bg-amber-50 p-3 rounded-md mb-3">
                        <p className="text-xs text-amber-700 mb-1">Corps de la requête (Body):</p>
                        <pre className="text-xs font-mono overflow-x-auto text-amber-900">{endpoint.body}</pre>
                      </div>
                    )}
                    
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
                    onChange={(e) => {
                      const selectedPath = e.target.value;
                      setTestEndpoint(selectedPath);
                      const selectedEndpoint = endpoints.find(ep => ep.path.replace(/{[^}]+}/g, 'test-id') === selectedPath);
                      if (selectedEndpoint) {
                        setTestMethod(selectedEndpoint.method as 'GET' | 'PATCH');
                        if (selectedEndpoint.body) {
                          setTestBody(selectedEndpoint.body);
                        } else {
                          setTestBody('');
                        }
                      }
                    }}
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

              {testMethod === 'PATCH' && (
                <div className="space-y-2">
                  <Label>Corps de la requête (JSON)</Label>
                  <Textarea
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    placeholder='{ "purchase_price": 899.99, "supplier_id": "uuid" }'
                    className="font-mono text-sm"
                    rows={4}
                  />
                </div>
              )}

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