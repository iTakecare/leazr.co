import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { 
  ShoppingBag, 
  Server, 
  Key, 
  Loader2, 
  Check, 
  X, 
  Download, 
  AlertCircle,
  PackageCheck,
  Save,
  RefreshCw,
  ExternalLink,
  LinkIcon,
  Tag,
  DownloadCloud,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  getWooCommerceProducts,
  fetchAllWooCommerceProducts,
  testWooCommerceConnection, 
  importWooCommerceProducts,
  getWooCommerceConfig,
  saveWooCommerceConfig
} from "@/services/woocommerceService";
import { WooCommerceProduct, ImportResult } from "@/types/woocommerce";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ensureStorageBucket } from "@/services/storageService";

const formSchema = z.object({
  siteUrl: z.string().url({ message: "Veuillez entrer une URL valide" }),
  consumerKey: z.string().min(1, { message: "Clé client requise" }),
  consumerSecret: z.string().min(1, { message: "Clé secrète requise" }),
});

const WooCommerceImporter = () => {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [productsList, setProductsList] = useState<WooCommerceProduct[]>([]);
  const [allProducts, setAllProducts] = useState<WooCommerceProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, boolean>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [importStage, setImportStage] = useState("");
  const [importOptions, setImportOptions] = useState({
    includeImages: true,
    includeDescriptions: true,
    includeVariations: true,
    overwriteExisting: false
  });
  const [selectAll, setSelectAll] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteUrl: "https://www.itakecare.be",
      consumerKey: "ck_09a895603eb75cc364669e8e3317fe13e607ace0",
      consumerSecret: "cs_52c6e6aa2332f0d7e1b395ab32c32f75a8ce4ccc",
    },
  });

  useEffect(() => {
    const loadSavedConfig = async () => {
      if (!user) return;
      
      try {
        console.log("Chargement de la configuration WooCommerce pour l'utilisateur:", user.id);
        const config = await getWooCommerceConfig(user.id);
        
        if (config) {
          console.log("Configuration WooCommerce chargée:", config);
          form.reset({
            siteUrl: config.site_url,
            consumerKey: config.consumer_key,
            consumerSecret: config.consumer_secret,
          });
          
          toast.success("Configuration WooCommerce chargée");
          setConfigLoaded(true);
        } else {
          console.log("Aucune configuration WooCommerce trouvée");
        }
      } catch (error) {
        console.error("Error loading WooCommerce config:", error);
        toast.error("Erreur lors du chargement de la configuration");
      }
    };
    
    loadSavedConfig();
  }, [user, form]);

  const handleSaveConfig = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("Vous devez être connecté pour sauvegarder la configuration");
      return;
    }
    
    setIsSaving(true);
    setConnectionError("");
    
    try {
      console.log("Sauvegarde de la configuration WooCommerce:", {
        siteUrl: values.siteUrl,
        consumerKey: values.consumerKey.substring(0, 5) + "...",
      });
      
      const success = await saveWooCommerceConfig(user.id, {
        siteUrl: values.siteUrl,
        consumerKey: values.consumerKey,
        consumerSecret: values.consumerSecret,
      });
      
      if (success) {
        toast.success("Configuration WooCommerce sauvegardée");
        setConfigLoaded(true);
      } else {
        toast.error("Échec de la sauvegarde de la configuration");
      }
    } catch (error) {
      console.error("Error saving WooCommerce config:", error);
      toast.error("Erreur lors de la sauvegarde de la configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (values: z.infer<typeof formSchema>) => {
    setIsConnecting(true);
    setIsConnected(false);
    setConnectionError("");
    
    try {
      console.log("Test de connexion à WooCommerce:", {
        siteUrl: values.siteUrl,
        consumerKey: values.consumerKey.substring(0, 5) + "...",
      });
      
      const success = await testWooCommerceConnection(
        values.siteUrl,
        values.consumerKey,
        values.consumerSecret
      );
      
      if (success) {
        console.log("Connexion WooCommerce réussie");
        toast.success("Connexion réussie à votre boutique WooCommerce");
        setIsConnected(true);
        fetchProducts(values, 1);
        
        if (!configLoaded && user) {
          await handleSaveConfig(values);
          setConfigLoaded(true);
        }
      } else {
        console.error("Échec de la connexion WooCommerce");
        setConnectionError("Échec de la connexion. Vérifiez vos identifiants et assurez-vous que votre boutique est accessible.");
        toast.error("Échec de la connexion. Vérifiez vos identifiants.");
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionError("Erreur technique lors du test de connexion. Veuillez réessayer plus tard.");
      toast.error("Erreur lors du test de connexion");
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchAllProducts = async (values: z.infer<typeof formSchema>) => {
    if (!isConnected) {
      toast.error("Veuillez d'abord tester la connexion");
      return;
    }
    
    setIsFetchingAll(true);
    setImportStage("Récupération de tous les produits...");
    
    try {
      console.log("Récupération de tous les produits WooCommerce");
      const products = await fetchAllWooCommerceProducts(
        values.siteUrl,
        values.consumerKey,
        values.consumerSecret
      );
      
      console.log(`${products.length} produits récupérés au total`);
      setAllProducts(products);
      
      setProductsList(products.slice(0, 10));
      setCurrentPage(1);
      setTotalPages(Math.max(1, Math.ceil(products.length / 10)));
      
      toast.success(`${products.length} produits récupérés`);
    } catch (error) {
      console.error("Error fetching all products:", error);
      toast.error("Erreur lors de la récupération des produits");
      setConnectionError("Erreur lors de la récupération des produits. Vérifiez vos identifiants et la connectivité de votre boutique.");
    } finally {
      setIsFetchingAll(false);
      setImportStage("");
    }
  };

  const fetchProducts = async (values: z.infer<typeof formSchema>, page: number) => {
    setIsFetchingProducts(true);
    
    try {
      console.log(`Récupération des produits WooCommerce, page ${page}`);
      const products = await getWooCommerceProducts(
        values.siteUrl,
        values.consumerKey,
        values.consumerSecret,
        page,
        10
      );
      
      console.log(`${products.length} produits récupérés`);
      setProductsList(products);
      setCurrentPage(page);
      
      if (allProducts.length > 0) {
        setTotalPages(Math.max(1, Math.ceil(allProducts.length / 10)));
      } else {
        setTotalPages(products.length === 10 ? page + 1 : page);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors de la récupération des produits");
      setConnectionError("Erreur lors de la récupération des produits. Vérifiez vos identifiants et la connectivité de votre boutique.");
    } finally {
      setIsFetchingProducts(false);
    }
  };

  useEffect(() => {
    const productsToCheck = allProducts.length > 0 ? allProducts : productsList;
    if (productsToCheck.length === 0) return;
    
    const allSelected = productsToCheck.every(product => selectedProducts[product.id]);
    setSelectAll(allSelected);
  }, [selectedProducts, productsList, allProducts]);

  useEffect(() => {
    const productsToSelect = allProducts.length > 0 ? allProducts : productsList;
    if (productsToSelect.length === 0) return;
    
    const newSelectedProducts = { ...selectedProducts };
    
    productsToSelect.forEach(product => {
      if (newSelectedProducts[product.id] === undefined) {
        newSelectedProducts[product.id] = true;
      }
    });
    
    setSelectedProducts(newSelectedProducts);
  }, [productsList, allProducts]);

  const navigatePages = (page: number) => {
    if (page < 1 || page > totalPages) return;
    
    if (allProducts.length > 0) {
      const startIndex = (page - 1) * 10;
      const endIndex = Math.min(startIndex + 10, allProducts.length);
      setProductsList(allProducts.slice(startIndex, endIndex));
      setCurrentPage(page);
    } else {
      fetchProducts(form.getValues(), page);
    }
  };

  const handleImportProducts = async () => {
    const productsToImportList = allProducts.length > 0 ? allProducts : productsList;
    const selectedProductsToImport = productsToImportList.filter(p => selectedProducts[p.id]);
    
    if (selectedProductsToImport.length === 0) {
      setErrors(["Aucun produit sélectionné pour l'importation"]);
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    setImportStage("Préparation de l'importation...");
    setImportResult(null);
    setErrors([]);
    
    try {
      const startTime = Date.now();
      
      const totalExpectedTime = selectedProductsToImport.length * 500;
      
      const updateProgressInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const calculatedProgress = Math.min(90, (elapsedTime / totalExpectedTime) * 100);
        setImportProgress(calculatedProgress);
        
        const stageSuffix = ".".repeat(Math.floor((elapsedTime / 1000) % 4) + 1);
        setImportStage(`Importation de ${selectedProductsToImport.length} produits${stageSuffix}`);
      }, 200);
      
      console.log(`Starting import with overwriteExisting: ${importOptions.overwriteExisting}`);
      
      await ensureStorageBucket('product-images');
      
      const result = await importWooCommerceProducts(
        selectedProductsToImport,
        importOptions.includeVariations,
        importOptions.overwriteExisting
      );
      
      clearInterval(updateProgressInterval);
      setImportProgress(100);
      setImportResult(result);
      
      if (result.success) {
        setImportStage(`Importation terminée: ${result.totalImported} produits importés, ${result.skipped} ignorés`);
        toast.success(`Importation réussie de ${result.totalImported} produits`);
      } else {
        setImportStage(`Importation terminée avec ${result.errors?.length || 0} erreurs`);
        toast.error(`Importation terminée avec des erreurs (${result.errors?.length} erreurs)`);
        if (result.errors && result.errors.length > 0) {
          setErrors(result.errors);
        }
      }
    } catch (error) {
      console.error("Error importing products:", error);
      toast.error("Erreur lors de l'importation des produits");
      setImportProgress(0);
      setImportStage("Erreur lors de l'importation");
      setErrors([error instanceof Error ? error.message : "Unknown error"]);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    navigatePages(newPage);
  };

  const resetConnection = () => {
    setIsConnected(false);
    setConnectionError("");
    setProductsList([]);
    setAllProducts([]);
    setSelectedProducts({});
  };

  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    
    const productsToUpdate = allProducts.length > 0 ? allProducts : productsList;
    const newSelectedProducts = { ...selectedProducts };
    
    productsToUpdate.forEach(product => {
      newSelectedProducts[product.id] = checked;
    });
    
    setSelectedProducts(newSelectedProducts);
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const getSelectedProductsCount = () => {
    const productsToCount = allProducts.length > 0 ? allProducts : productsList;
    return productsToCount.filter(p => selectedProducts[p.id]).length;
  };

  const [errors, setErrors] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Importation du catalogue WooCommerce
        </h2>
        
        {isConnected ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Connecté
          </span>
        ) : connectionError ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <X className="h-3 w-3 mr-1" />
            Erreur de connexion
          </span>
        ) : null}
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleTestConnection)} className="space-y-4">
          <FormField
            control={form.control}
            name="siteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  URL de votre boutique WooCommerce
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Server className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input 
                      placeholder="https://monsite.com" 
                      {...field} 
                      disabled={isConnected || isConnecting}
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Entrez l'URL complète de votre site WordPress avec WooCommerce
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="consumerKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Clé client WooCommerce
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input 
                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx" 
                        type="text" 
                        {...field} 
                        disabled={isConnected || isConnecting}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="consumerSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Clé secrète WooCommerce
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input 
                        placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx" 
                        type={showSecret ? "text" : "password"}
                        {...field} 
                        disabled={isConnected || isConnecting}
                        className="pl-10 pr-20"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none text-xs font-medium"
                        >
                          {showSecret ? "Masquer" : "Afficher"}
                        </button>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {connectionError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>{connectionError}</div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button 
              type="submit" 
              disabled={isConnecting || isSaving} 
              className="mt-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Test de connexion...
                </>
              ) : isConnected ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Connecté
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Tester la connexion
                </>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleSaveConfig(form.getValues())}
              disabled={isConnecting || isSaving || !user}
              className="mt-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder la configuration
                </>
              )}
            </Button>
            
            {isConnected && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetConnection}
                className="mt-2"
              >
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            )}
          </div>
        </form>
      </Form>
      
      {isConnected && (
        <Card className="mt-8">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Produits disponibles
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => fetchProducts(form.getValues(), currentPage)}
                disabled={isFetchingProducts || isFetchingAll}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingProducts ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={() => fetchAllProducts(form.getValues())}
                disabled={isFetchingProducts || isFetchingAll}
              >
                <DownloadCloud className={`h-4 w-4 mr-2 ${isFetchingAll ? 'animate-spin' : ''}`} />
                {isFetchingAll ? 'Récupération...' : 'Tout récupérer'}
              </Button>
              
              <Button 
                onClick={() => setImportDialogOpen(true)}
                disabled={productsList.length === 0 || isImporting || getSelectedProductsCount() === 0}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Importer ({getSelectedProductsCount()})
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-2">
            {importStage && (
              <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-800">
                {importStage}
              </div>
            )}
          
            <div className="border-b pb-4 mb-4">
              <h4 className="text-sm font-medium mb-3">Options d'importation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeImages" 
                    checked={importOptions.includeImages}
                    onCheckedChange={(checked) => 
                      setImportOptions({...importOptions, includeImages: checked === true})
                    }
                  />
                  <label
                    htmlFor="includeImages"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Importer les images
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeDescriptions" 
                    checked={importOptions.includeDescriptions}
                    onCheckedChange={(checked) => 
                      setImportOptions({...importOptions, includeDescriptions: checked === true})
                    }
                  />
                  <label
                    htmlFor="includeDescriptions"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Importer les descriptions
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeVariations" 
                    checked={importOptions.includeVariations}
                    onCheckedChange={(checked) => 
                      setImportOptions({...importOptions, includeVariations: checked === true})
                    }
                  />
                  <label
                    htmlFor="includeVariations"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Importer les variations
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="overwriteExisting" 
                    checked={importOptions.overwriteExisting}
                    onCheckedChange={(checked) => 
                      setImportOptions({...importOptions, overwriteExisting: checked === true})
                    }
                  />
                  <label
                    htmlFor="overwriteExisting"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Écraser les produits existants
                  </label>
                </div>
              </div>
            </div>
            
            {isFetchingProducts || isFetchingAll ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : productsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p>Aucun produit trouvé dans votre boutique WooCommerce</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => fetchProducts(form.getValues(), 1)}
                >
                  Réessayer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="selectAll" 
                      checked={selectAll}
                      onCheckedChange={(checked) => handleSelectAllChange(checked === true)}
                    />
                    <label
                      htmlFor="selectAll"
                      className="text-sm font-medium leading-none"
                    >
                      {selectAll ? "Tout désélectionner" : "Tout sélectionner"}
                    </label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getSelectedProductsCount()} produits sélectionnés sur {(allProducts.length > 0 ? allProducts : productsList).length}
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <div className="grid grid-cols-13 gap-2 p-3 bg-muted text-sm font-medium">
                    <div className="col-span-1"></div>
                    <div className="col-span-6">Nom</div>
                    <div className="col-span-2">Prix</div>
                    <div className="col-span-4">Catégorie</div>
                  </div>
                  <div className="divide-y">
                    {productsList.map((product) => (
                      <div key={product.id} className="grid grid-cols-13 gap-2 p-3 text-sm items-center">
                        <div className="col-span-1">
                          <Checkbox 
                            checked={!!selectedProducts[product.id]} 
                            onCheckedChange={() => toggleProductSelection(product.id)}
                            className="h-4 w-4"
                          />
                        </div>
                        <div className="col-span-6 flex items-center gap-2">
                          {product.images.length > 0 ? (
                            <img 
                              src={product.images[0].src} 
                              alt={product.name} 
                              className="w-8 h-8 object-contain rounded-md"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="truncate">{product.name}</span>
                        </div>
                        <div className="col-span-2">
                          {parseFloat(product.price || product.regular_price || "0").toFixed(2)} €
                        </div>
                        <div className="col-span-4 flex flex-wrap gap-1">
                          {product.categories.length > 0 ? (
                            product.categories.map((category, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {category.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Non catégorisé</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isFetchingProducts || isFetchingAll}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages}
                    {allProducts.length > 0 && ` (${allProducts.length} produits au total)`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isFetchingProducts || isFetchingAll}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Importer les produits WooCommerce
            </DialogTitle>
            <DialogDescription>
              {!importResult ? (
                `Vous êtes sur le point d'importer ${getSelectedProductsCount()} produits sélectionnés dans votre catalogue.`
              ) : (
                importResult.success ? (
                  `Importation terminée avec succès!`
                ) : (
                  `Importation terminée avec des erreurs.`
                )
              )}
            </DialogDescription>
          </DialogHeader>
          
          {!importResult ? (
            <>
              {isImporting && (
                <div className="py-4">
                  <Progress value={importProgress} className="mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {importStage || "Importation en cours..."} {Math.round(importProgress)}%
                  </p>
                </div>
              )}
              
              {errors.length > 0 && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
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
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setImportDialogOpen(false)}
                  disabled={isImporting}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleImportProducts}
                  disabled={isImporting || getSelectedProductsCount() === 0}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importation...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Démarrer l'importation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-4">
                <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {importResult.success ? (
                      <PackageCheck className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    )}
                    <h3 className="font-medium">
                      {importResult.success ? 'Importation réussie' : 'Importation partielle'}
                    </h3>
                  </div>
                  <ul className="space-y-1 pl-9 text-sm">
                    <li>Produits importés: {importResult.totalImported}</li>
                    {importResult.skipped > 0 && (
                      <li>Produits ignorés: {importResult.skipped}</li>
                    )}
                  </ul>
                </div>
                
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Erreurs rencontrées:</h4>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index} className="text-destructive text-xs">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={() => setImportDialogOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WooCommerceImporter;
