import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Loader2, CheckCircle, AlertCircle, Package } from "lucide-react";

interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  monthly_price: number;
  imageUrl?: string;
  brand: string;
  category: string;
  specifications: Record<string, any>;
  slug: string;
}

interface WooCommerceConfig {
  id: string;
  site_url: string;
  consumer_key: string;
  consumer_secret: string;
  name: string;
}

export function WooCommerceImportForm() {
  const [configs, setConfigs] = useState<WooCommerceConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  
  const { toast } = useToast();
  const { companyId, loading: companyLoading } = useMultiTenant();

  useEffect(() => {
    loadWooCommerceConfigs();
  }, []);

  const loadWooCommerceConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('woocommerce_configs')
        .select('*')
        .order('name');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des configurations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les configurations WooCommerce",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    if (!selectedConfig || !companyId) return;

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: {
          action: 'test-connection',
          configId: selectedConfig,
          companyId: companyId
        }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('success');
        toast({
          title: "Connexion réussie",
          description: "La connexion à WooCommerce fonctionne correctement",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Erreur de connexion",
          description: data.error || "Impossible de se connecter à WooCommerce",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur de test de connexion:', error);
      setConnectionStatus('error');
      toast({
        title: "Erreur",
        description: "Erreur lors du test de connexion",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const fetchProducts = async () => {
    if (!selectedConfig || connectionStatus !== 'success' || !companyId) return;

    setIsFetchingProducts(true);
    setProducts([]);
    setSelectedProducts(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: {
          action: 'fetch-products',
          configId: selectedConfig,
          companyId: companyId
        }
      });

      if (error) throw error;

      if (data.success) {
        setProducts(data.products || []);
        toast({
          title: "Produits récupérés",
          description: `${data.total} produits trouvés dans WooCommerce`,
        });
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de récupérer les produits",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la récupération des produits",
        variant: "destructive",
      });
    } finally {
      setIsFetchingProducts(false);
    }
  };

  const importSelectedProducts = async () => {
    if (selectedProducts.size === 0 || !companyId) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportedCount(0);

    try {
      const productIds = Array.from(selectedProducts);
      
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: {
          action: 'import-products',
          configId: selectedConfig,
          productIds,
          companyId: companyId
        }
      });

      if (error) throw error;

      if (data.success) {
        setImportedCount(data.imported);
        setImportProgress(100);
        toast({
          title: "Import terminé",
          description: `${data.imported} produits importés avec succès`,
        });
        
        // Réinitialiser la sélection
        setSelectedProducts(new Set());
      } else {
        toast({
          title: "Erreur d'import",
          description: data.error || "Erreur lors de l'import des produits",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'import des produits",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleProductSelection = (productId: number) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const selectAllProducts = () => {
    setSelectedProducts(new Set(products.map(p => p.id)));
  };

  const deselectAllProducts = () => {
    setSelectedProducts(new Set());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Import WooCommerce
          </CardTitle>
          <CardDescription>
            Importez vos produits directement depuis votre boutique WooCommerce
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Configuration WooCommerce</label>
            <Select value={selectedConfig} onValueChange={setSelectedConfig}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une configuration" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    {config.name} ({config.site_url})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              disabled={!selectedConfig || isTestingConnection || companyLoading || !companyId}
              variant="outline"
            >
              {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tester la connexion
            </Button>
            
            {connectionStatus === 'success' && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Connecté
              </Badge>
            )}
            
            {connectionStatus === 'error' && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Erreur
              </Badge>
            )}
          </div>

          <Button
            onClick={fetchProducts}
            disabled={connectionStatus !== 'success' || isFetchingProducts || companyLoading || !companyId}
            className="w-full"
          >
            {isFetchingProducts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Récupérer les produits
          </Button>
        </CardContent>
      </Card>

      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produits trouvés ({products.length})</CardTitle>
            <CardDescription>
              Sélectionnez les produits à importer dans votre catalogue
            </CardDescription>
            <div className="flex gap-2">
              <Button onClick={selectAllProducts} variant="outline" size="sm">
                Tout sélectionner
              </Button>
              <Button onClick={deselectAllProducts} variant="outline" size="sm">
                Tout désélectionner
              </Button>
              <Button 
                onClick={importSelectedProducts}
                disabled={selectedProducts.size === 0 || isImporting || companyLoading || !companyId}
                className="ml-auto"
              >
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importer ({selectedProducts.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isImporting && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Import en cours...</span>
                  <span>{importedCount} importés</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">
                          {product.price.toFixed(2)}€
                        </Badge>
                        <Badge variant="outline">
                          {product.monthly_price.toFixed(2)}€/mois
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-24 object-cover rounded"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {configs.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune configuration WooCommerce trouvée. Veuillez d'abord configurer votre boutique WooCommerce dans les paramètres.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}