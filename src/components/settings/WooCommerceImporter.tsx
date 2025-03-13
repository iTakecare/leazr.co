import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingBag, 
  Download, 
  Check, 
  AlertCircle, 
  Image as ImageIcon, 
  Server, 
  Key, 
  DownloadCloud, 
  Loader2, 
  Info, 
  Tag, 
  LayoutGrid, 
  Settings, 
  Link as LinkIcon,
  X,
  CheckCircle,
  ExternalLink,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: { id: number; name: string; slug: string }[];
  images: { id: number; src: string; alt: string }[];
  variations: number[];
  attributes: {
    id: number;
    name: string;
    options: string[];
  }[];
  sku: string;
  stock_status: string;
}

// This would normally be in a separate service file
const updateConfig = ({ url, consumerKey, consumerSecret }: { 
  url: string;
  consumerKey: string;
  consumerSecret: string;
}) => {
  // Store config for API calls
  localStorage.setItem('woocommerce_config', JSON.stringify({
    url, consumerKey, consumerSecret
  }));
};

const fetchAllProducts = async (): Promise<WooCommerceProduct[]> => {
  const config = JSON.parse(localStorage.getItem('woocommerce_config') || '{}');
  const { url, consumerKey, consumerSecret } = config;
  
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const apiUrl = `${url}/wp-json/wc/v3/products?per_page=100`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const products: WooCommerceProduct[] = await response.json();
    return products;
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }
};

const fetchProductVariations = async (productId: number): Promise<any[]> => {
  const config = JSON.parse(localStorage.getItem('woocommerce_config') || '{}');
  const { url, consumerKey, consumerSecret } = config;
  
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const apiUrl = `${url}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch variations: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching variations for product ${productId}:`, error);
    return [];
  }
};

const WooCommerceImporter = () => {
  // URL et identifiants par défaut (préremplis)
  const [siteUrl, setSiteUrl] = useState('https://www.itakecare.be');
  const [consumerKey, setConsumerKey] = useState('ck_09a895603eb75cc364669e8e3317fe13e607ace0');
  const [consumerSecret, setConsumerSecret] = useState('cs_52c6e6aa2332f0d7e1b395ab32c32f75a8ce4ccc');
  const [showSecret, setShowSecret] = useState(false);
  
  // Options d'importation
  const [fetchingOptions, setFetchingOptions] = useState({
    includeImages: true,
    includeVariations: true,
    includeDescriptions: true,
    importCategories: true,
    overwriteExisting: false
  });
  
  // États de l'interface
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'fetching' | 'importing' | 'completed' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [totalProductsToImport, setTotalProductsToImport] = useState(0);
  const [importedImages, setImportedImages] = useState(0);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  
  // Vérification du schéma de la base de données
  const [hasCheckedSchema, setHasCheckedSchema] = useState(false);
  const [schemaHasCategory, setSchemaHasCategory] = useState(false);
  const [schemaHasDescription, setSchemaHasDescription] = useState(false);

  // Vérifier si le schéma a les colonnes nécessaires au chargement
  useEffect(() => {
    checkSchema();
  }, []);

  const checkSchema = async () => {
    try {
      // Vérifier l'existence des colonnes category et description
      const { data, error } = await supabase
        .from('products')
        .select('category, description')
        .limit(1);
      
      if (!error) {
        setSchemaHasCategory(true);
        setSchemaHasDescription(true);
      } else {
        console.warn('Schema check failed, assuming new columns are not available yet:', error);
        // Si on a une erreur, déterminer quelles colonnes sont manquantes
        if (error.message && error.message.includes('category')) {
          setSchemaHasCategory(false);
        }
        if (error.message && error.message.includes('description')) {
          setSchemaHasDescription(false);
        }
      }
    } catch (error) {
      console.error('Error checking schema:', error);
    } finally {
      setHasCheckedSchema(true);
    }
  };
  
  // Validation de l'URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Vérification de la connexion à l'API WooCommerce
  const testConnection = async () => {
    if (!siteUrl || !consumerKey || !consumerSecret) {
      setErrors(['Veuillez remplir tous les champs requis']);
      return false;
    }
    
    if (!isValidUrl(siteUrl)) {
      setErrors(['L\'URL du site n\'est pas valide']);
      return false;
    }

    try {
      setConnectionStatus('untested');
      // Mettre à jour la configuration
      updateConfig({
        url: siteUrl,
        consumerKey,
        consumerSecret
      });

      // Tester avec une requête simple
      const url = `${siteUrl}/wp-json/wc/v3/products?per_page=1`;
      const credentials = btoa(`${consumerKey}:${consumerSecret}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur de connexion: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data || !Array.isArray(data)) {
        throw new Error('Format de réponse invalide');
      }
      
      setConnectionTested(true);
      setConnectionStatus('success');
      return true;
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      setErrors([`Erreur de connexion à l'API WooCommerce: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
      setConnectionStatus('error');
      return false;
    }
  };
  
  // Mapper les catégories WooCommerce vers les catégories internes
  const getCategoryMapping = (categories: { id: number; name: string; slug: string }[]) => {
    if (!categories || categories.length === 0) return 'other';
    
    const categoryMap: { [key: string]: string } = {
      'ordinateur': 'desktop',
      'desktop': 'desktop',
      'pc': 'desktop',
      'ordinateur-portable': 'laptop',
      'laptop': 'laptop',
      'portable': 'laptop',
      'tablette': 'tablet',
      'tablet': 'tablet',
      'ipad': 'tablet',
      'telephone': 'smartphone',
      'smartphone': 'smartphone',
      'iphone': 'smartphone',
      'phone': 'smartphone',
      'mobile': 'smartphone',
      'ecran': 'display',
      'moniteur': 'display',
      'display': 'display',
      'accessoire': 'accessory',
      'accessory': 'accessory',
      'peripherique': 'peripheral',
      'peripheral': 'peripheral'
    };
    
    // Vérifier la catégorie la plus spécifique (dernier élément)
    const slug = categories[categories.length - 1].slug;
    
    // Correspondance exacte
    if (categoryMap[slug]) return categoryMap[slug];
    
    // Correspondance partielle
    for (const key in categoryMap) {
      if (slug.includes(key)) return categoryMap[key];
    }
    
    // Vérifier les mots dans le nom de la catégorie
    const words = slug.split('-');
    for (const word of words) {
      if (categoryMap[word]) return categoryMap[word];
    }
    
    // Vérifier les catégories parentes
    if (categories.length > 1) {
      const parentSlug = categories[categories.length - 2].slug;
      if (categoryMap[parentSlug]) return categoryMap[parentSlug];
      
      for (const key in categoryMap) {
        if (parentSlug.includes(key)) return categoryMap[key];
      }
    }
    
    return 'other';
  };
  
  // Nettoyer le HTML pour extraire juste le texte
  const cleanHtml = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    let text = doc.body.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    
    if (text.length > 500) {
      text = text.substring(0, 497) + '...';
    }
    
    return text;
  };
  
  // Convertir le prix WooCommerce en nombre
  const parsePrice = (price: string) => {
    if (!price) return 0;
    return parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  };
  
  // Calculer le prix mensuel en fonction du prix d'achat
  const calculateMonthlyPrice = (purchasePrice: number) => {
    // Formule simple : environ 3.5% du prix d'achat
    return Math.round(purchasePrice * 0.035 * 100) / 100;
  };
  
  // Récupérer les produits depuis WooCommerce
  const fetchProducts = async () => {
    if (!await testConnection()) {
      return;
    }
    
    setImportStatus('fetching');
    setErrors([]);
    setProducts([]);
    
    try {
      setImportStage("Récupération des produits WooCommerce...");
      
      // Récupérer tous les produits avec pagination
      const fetchedProducts = await fetchAllProducts();
      
      setProducts(fetchedProducts);
      setTotalProductsToImport(fetchedProducts.length);
      setImportStage(`${fetchedProducts.length} produits trouvés`);
      
    } catch (error) {
      console.error('Error fetching WooCommerce products:', error);
      setErrors([`Erreur lors de la récupération des produits: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
      setImportStatus('error');
    } finally {
      if (importStatus !== 'error') {
        setImportStatus('idle');
      }
    }
  };
  
  // Importer les produits dans la base de données
  const importProducts = async () => {
    if (products.length === 0) {
      setErrors(['Aucun produit à importer']);
      return;
    }
    
    setImportStatus('importing');
    setSuccessCount(0);
    setErrorCount(0);
    setErrors([]);
    setImportProgress(0);
    setImportedImages(0);
    
    try {
      // Vérifier les produits existants si on ne veut pas les écraser
      let existingProducts: Record<string, boolean> = {};
      
      if (!fetchingOptions.overwriteExisting) {
        setImportStage('Vérification des produits existants...');
        const { data, error } = await supabase
          .from('products')
          .select('name, brand');
        
        if (error) throw error;
        
        if (data) {
          existingProducts = data.reduce((acc, product) => {
            const key = `${product.brand}-${product.name}`.toLowerCase();
            acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>);
        }
      }
      
      let importSuccess = 0;
      let importErrors = 0;
      
      // Traiter chaque produit
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        setImportProgress(Math.round((i / products.length) * 100));
        setImportStage(`Importation du produit ${i + 1}/${products.length}: ${product.name}`);
        
        try {
          // Extraire la marque et le nom
          let brand = 'Generic';
          let name = product.name;
          
          // Essayer d'extraire la marque du début du nom
          const brandMatch = name.match(/^([\w\s]+)\s+(.+)$/);
          if (brandMatch) {
            brand = brandMatch[1].trim();
            name = brandMatch[2].trim();
          }
          
          // Vérifier si le produit existe déjà
          const productKey = `${brand}-${name}`.toLowerCase();
          if (!fetchingOptions.overwriteExisting && existingProducts[productKey]) {
            setErrors(prev => [...prev, `Produit "${product.name}" déjà existant, ignoré`]);
            importErrors++;
            continue;
          }
          
          // Gérer l'image si l'option est activée
          let imageUrl = '';
          if (fetchingOptions.includeImages && product.images && product.images.length > 0) {
            setImportStage(`Importation du produit ${i + 1}/${products.length}: ${product.name} - Traitement de l'image`);
            
            // Pour l'instant on utilise directement l'URL de l'image
            // Dans une implémentation complète, on téléchargerait et stockerait l'image
            imageUrl = product.images[0].src;
            setImportedImages(prev => prev + 1);
          }
          
          // Préparer la description
          let description = '';
          if (fetchingOptions.includeDescriptions && schemaHasDescription) {
            description = product.short_description || product.description 
              ? cleanHtml(product.short_description || product.description)
              : '';
          }
          
          // Mapper la catégorie
          let category = 'other';
          if (fetchingOptions.importCategories && schemaHasCategory && product.categories && product.categories.length > 0) {
            category = getCategoryMapping(product.categories);
          }
          
          // Calculer les prix
          const price = parsePrice(product.price);
          const monthlyPrice = calculateMonthlyPrice(price);
          
          // Préparer les données du produit
          const productData = {
            name,
            brand,
            price,
            monthly_price: monthlyPrice,
            image_url: imageUrl || null,
            active: product.stock_status === 'instock'
          };
          
          // Ajouter les champs optionnels selon le schéma
          if (schemaHasCategory) {
            productData.category = category;
          }
          
          if (schemaHasDescription) {
            productData.description = description;
          }
          
          // Insertion dans la base de données
          let error;
          
          if (fetchingOptions.overwriteExisting) {
            // Tentative de mise à jour (si existe) sinon insertion
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('name', name)
              .eq('brand', brand)
              .maybeSingle();
              
            if (existingProduct) {
              // Mise à jour du produit existant
              const { error: updateError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', existingProduct.id);
                
              error = updateError;
            } else {
              // Insertion d'un nouveau produit
              const { error: insertError } = await supabase
                .from('products')
                .insert([productData]);
                
              error = insertError;
            }
          } else {
            // Insertion directe (on a déjà filtré les existants)
            const { error: insertError } = await supabase
              .from('products')
              .insert([productData]);
                
            error = insertError;
          }
          
          if (error) throw error;
          
          // Gestion des variations si l'option est activée
          if (fetchingOptions.includeVariations && product.variations && product.variations.length > 0) {
            setImportStage(`Importation du produit ${i + 1}/${products.length}: ${product.name} - Traitement des variations`);
            
            // Récupérer les détails des variations
            try {
              const variations = await fetchProductVariations(product.id);
              
              // Pour chaque variation, créer un produit séparé
              for (const variation of variations) {
                // Construire un nom incluant les attributs
                const attributeText = variation.attributes
                  .map((attr: any) => `${attr.option}`)
                  .join(' - ');
                  
                const variationName = attributeText ? `${name} - ${attributeText}` : name;
                
                // Préparer les données de la variation
                const variationData = {
                  name: variationName,
                  brand,
                  price: parsePrice(variation.price || product.price),
                  monthly_price: calculateMonthlyPrice(parsePrice(variation.price || product.price)),
                  image_url: (variation.image?.src || imageUrl || null),
                  active: variation.stock_status === 'instock' || product.stock_status === 'instock'
                };
                
                if (schemaHasCategory) {
                  variationData.category = category;
                }
                
                if (schemaHasDescription) {
                  variationData.description = description;
                }
                
                // Vérifier si cette variation existe déjà
                const variationKey = `${brand}-${variationName}`.toLowerCase();
                if (!fetchingOptions.overwriteExisting && existingProducts[variationKey]) {
                  continue; // Ignorer cette variation
                }
                
                // Insérer la variation comme produit distinct
                const { error: variationError } = await supabase
                  .from('products')
                  .insert([variationData]);
                  
                if (variationError) {
                  console.error(`Error importing variation of "${product.name}":`, variationError);
                }
              }
            } catch (variationError) {
              console.error(`Error fetching variations for "${product.name}":`, variationError);
            }
          }
          
          importSuccess++;
        } catch (error) {
          console.error(`Error importing product ${product.name}:`, error);
          setErrors(prev => [...prev, `Erreur lors de l'importation de "${product.name}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
          importErrors++;
        }
      }
      
      setSuccessCount(importSuccess);
      setErrorCount(importErrors);
      setImportProgress(100);
      setImportStatus('completed');
      setImportStage('Importation terminée');
      
    } catch (error) {
      console.error('Error importing products:', error);
      setErrors(prev => [...prev, `Erreur lors de l'importation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
      setImportStatus('error');
    }
  };
  
  // Réinitialiser le formulaire
  const resetForm = () => {
    if (importStatus === 'fetching' || importStatus === 'importing') {
      if (!confirm('Êtes-vous sûr de vouloir annuler l\'importation en cours ?')) {
        return;
      }
    }
    
    setImportStatus('idle');
    setProducts([]);
    setSuccessCount(0);
    setErrorCount(0);
    setErrors([]);
    setImportProgress(0);
    setImportStage('');
  };
  
  // Obtenir le badge de statut
  const getStatusBadge = () => {
    switch (importStatus) {
      case 'fetching':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Récupération des produits</span>;
      case 'importing':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Importation en cours</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Importation terminée</span>;
      case 'error':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Erreur</span>;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-gray-500" />
          Import du catalogue WooCommerce
        </h2>
        
        {getStatusBadge()}
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Cet outil permet d'importer les produits de votre boutique WooCommerce directement dans le catalogue iTakecare.
              Les identifiants d'API sont préremplis pour faciliter l'importation.
            </p>
          </div>
        </div>
      </div>
      
      {/* Formulaire des identifiants */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Informations de connexion WooCommerce</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="block mb-1">
              URL du site WordPress
            </Label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                disabled={importStatus === 'fetching' || importStatus === 'importing'}
                placeholder="https://www.itakecare.be"
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label className="block mb-1">
              Clé API Consommateur
            </Label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                disabled={importStatus === 'fetching' || importStatus === 'importing'}
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxx"
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label className="block mb-1">
              Secret API Consommateur
            </Label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type={showSecret ? "text" : "password"}
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                disabled={importStatus === 'fetching' || importStatus === 'importing'}
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxx"
                className="pl-10"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  {showSecret ? (
                    <span className="text-xs font-medium">Masquer</span>
                  ) : (
                    <span className="text-xs font-medium">Afficher</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bouton de test de connexion */}
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={importStatus === 'fetching' || importStatus === 'importing'}
              className="flex items-center gap-2"
            >
              {connectionStatus === 'untested' ? (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Tester la connexion
                </>
              ) : connectionStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Connexion réussie
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Erreur de connexion
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Options d'importation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Options d'importation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <Switch
              checked={fetchingOptions.includeImages}
              onCheckedChange={(checked) => setFetchingOptions({...fetchingOptions, includeImages: checked})}
              disabled={importStatus === 'fetching' || importStatus === 'importing'}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Importer les images</span>
              <p className="text-xs text-muted-foreground">Les URLs des images seront utilisées</p>
            </div>
          </label>
          
          <label className="flex items-center gap-2">
            <Switch
              checked={fetchingOptions.includeVariations}
              onCheckedChange={(checked) => setFetchingOptions({...fetchingOptions, includeVariations: checked})}
              disabled={importStatus === 'fetching' || importStatus === 'importing'}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Importer les variations</span>
              <p className="text-xs text-muted-foreground">Chaque variation sera traitée comme un produit distinct</p>
            </div>
          </label>
          
          <label className="flex items-center gap-2">
            <Switch
              checked={fetchingOptions.includeDescriptions}
              onCheckedChange={(checked) => setFetchingOptions({...fetchingOptions, includeDescriptions: checked})}
              disabled={importStatus === 'fetching' || importStatus === 'importing' || !schemaHasDescription}
            />
            <div>
              <span className={`text-sm font-medium ${!schemaHasDescription ? 'text-gray-400' : 'text-gray-700'}`}>
                Importer les descriptions
                {!schemaHasDescription && " (requiert une mise à jour du schéma)"}
              </span>
              <p className={`text-xs ${!schemaHasDescription ? 'text-gray-400' : 'text-muted-foreground'}`}>
                Les descriptions courtes et longues seront importées
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-2">
            <Switch
              checked={fetchingOptions.importCategories}
              onCheckedChange={(checked) => setFetchingOptions({...fetchingOptions, importCategories: checked})}
              disabled={importStatus === 'fetching' || importStatus === 'importing' || !schemaHasCategory}
            />
            <div>
              <span className={`text-sm font-medium ${!schemaHasCategory ? 'text-gray-400' : 'text-gray-700'}`}>
                Mapper les catégories
                {!schemaHasCategory && " (requiert une mise à jour du schéma)"}
              </span>
              <p className={`text-xs ${!schemaHasCategory ? 'text-gray-400' : 'text-muted-foreground'}`}>
                Les catégories seront converties au format iTakecare
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-2 md:col-span-2">
            <Switch
              checked={fetchingOptions.overwriteExisting}
              onCheckedChange={(checked) => setFetchingOptions({...fetchingOptions, overwriteExisting: checked})}
              disabled={importStatus === 'fetching' || importStatus === 'importing'}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Écraser les produits existants</span>
              <p className="text-xs text-muted-foreground">Les produits existants seront mis à jour au lieu d'être ignorés</p>
            </div>
          </label>
        </div>
      </div>
      
      {/* Boutons d'action */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap gap-3">
          {importStatus === 'idle' && (
            <Button
              onClick={fetchProducts}
              disabled={!siteUrl || !consumerKey || !consumerSecret || importStatus !== 'idle'}
              className="flex items-center gap-2"
            >
              <Server className="h-4 w-4" />
              Récupérer les produits
            </Button>
          )}
          
          {importStatus === 'fetching' && (
            <Button
              disabled
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Récupération en cours...
            </Button>
          )}
          
          {products.length > 0 && importStatus !== 'importing' && importStatus !== 'fetching' && (
            <Button
              onClick={importProducts}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <DownloadCloud className="h-4 w-4" />
              Importer {products.length} produits
            </Button>
          )}
          
          {importStatus === 'importing' && (
            <Button
              disabled
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Importation en cours...
            </Button>
          )}
          
          {importStatus !== 'idle' && (
            <Button
              onClick={resetForm}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {importStatus === 'completed' || importStatus === 'error' ? 'Recommencer' : 'Annuler'}
            </Button>
          )}
        </div>
        
        {products.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {products.length} produits trouvés
          </div>
        )}
      </div>
      
      {/* Indicateur de progression */}
      {(importStatus === 'importing' || importStatus === 'completed') && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-2 flex justify-between">
            <h3 className="text-md font-medium text-gray-900">{importStage || "Progression de l'importation"}</h3>
            <span className="text-sm font-medium text-gray-700">{importProgress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                importStatus === 'completed' ? 'bg-green-600' : 'bg-primary'
              }`}
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
          
          {(importStatus === 'importing' || importStatus === 'completed') && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="font-medium text-green-800">{successCount}</div>
                <div className="text-xs text-green-600">Produits importés</div>
              </div>
              
              {fetchingOptions.includeImages && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="font-medium text-blue-800">{importedImages}</div>
                  <div className="text-xs text-blue-600">Images importées</div>
                </div>
              )}
              
              <div className={`${errorCount > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-lg p-3`}>
                <div className={`font-medium ${errorCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>
                  {errorCount}
                </div>
                <div className={`text-xs ${errorCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  Erreurs
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Messages d'erreur */}
      {errors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {errors.length} {errors.length > 1 ? 'erreurs ont été' : 'erreur a été'} rencontrée{errors.length > 1 ? 's' : ''}
              </h3>
              <div className="mt-2 text-sm text-red-700 max-h-40 overflow-auto">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tableau d'aperçu des produits */}
      {products.length > 0 && importStatus !== 'importing' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-md font-medium text-gray-900 flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-gray-500" />
              Aperçu des produits ({products.length})
            </h3>
            <div className="text-xs text-muted-foreground">
              Affichage limité à 5 produits pour performance
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Catégories
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Images
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Variations
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-gray-200">
                {products.slice(0, 5).map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].src}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover flex-shrink-0 mr-4"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0 mr-4">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {product.sku || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="text-foreground font-medium">
                        {product.price ? `${product.price} €` : 'N/A'}
                      </div>
                      {product.regular_price !== product.price && (
                        <div className="text-xs text-muted-foreground line-through">
                          {product.regular_price} €
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {product.categories && product.categories.length > 0 ? (
                          product.categories.map((category, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {category.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucune catégorie</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 text-xs rounded-full bg-muted text-foreground">
                        {product.images?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 text-xs rounded-full bg-muted text-foreground">
                        {product.variations?.length || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WooCommerceImporter;
