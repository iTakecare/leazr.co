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
  ChevronRight, 
  ArrowRight,
  AlertCircle,
  PackageCheck,
  Save
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
  testWooCommerceConnection, 
  importWooCommerceProducts,
  getWooCommerceConfig,
  saveWooCommerceConfig
} from "@/services/woocommerceService";
import { WooCommerceProduct, ImportResult } from "@/types/woocommerce";
import { useAuth } from "@/context/AuthContext";

// Schéma de validation du formulaire
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
  const [isSaving, setIsSaving] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [productsList, setProductsList] = useState<WooCommerceProduct[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Initialiser le formulaire
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteUrl: "",
      consumerKey: "",
      consumerSecret: "",
    },
  });

  // Charger la configuration WooCommerce sauvegardée
  useEffect(() => {
    const loadSavedConfig = async () => {
      if (!user) return;
      
      try {
        const config = await getWooCommerceConfig(user.id);
        
        if (config) {
          form.reset({
            siteUrl: config.site_url,
            consumerKey: config.consumer_key,
            consumerSecret: config.consumer_secret,
          });
          
          toast.success("Configuration WooCommerce chargée");
          setConfigLoaded(true);
        }
      } catch (error) {
        console.error("Error loading WooCommerce config:", error);
      }
    };
    
    loadSavedConfig();
  }, [user]);

  // Sauvegarder la configuration WooCommerce
  const handleSaveConfig = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("Vous devez être connecté pour sauvegarder la configuration");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const success = await saveWooCommerceConfig(user.id, {
        siteUrl: values.siteUrl,
        consumerKey: values.consumerKey,
        consumerSecret: values.consumerSecret,
      });
      
      if (success) {
        toast.success("Configuration WooCommerce sauvegardée");
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

  // Tester la connexion à WooCommerce
  const handleTestConnection = async (values: z.infer<typeof formSchema>) => {
    setIsConnecting(true);
    setIsConnected(false);
    
    try {
      const success = await testWooCommerceConnection(
        values.siteUrl,
        values.consumerKey,
        values.consumerSecret
      );
      
      if (success) {
        toast.success("Connexion réussie à votre boutique WooCommerce");
        setIsConnected(true);
        fetchProducts(values, 1);
        
        // Sauvegarder automatiquement si la connexion a réussi et pas encore de config sauvegardée
        if (!configLoaded && user) {
          await handleSaveConfig(values);
          setConfigLoaded(true);
        }
      } else {
        toast.error("Échec de la connexion. Vérifiez vos identifiants.");
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("Erreur lors du test de connexion");
    } finally {
      setIsConnecting(false);
    }
  };

  // Récupérer les produits WooCommerce
  const fetchProducts = async (values: z.infer<typeof formSchema>, page: number) => {
    setIsFetchingProducts(true);
    
    try {
      const products = await getWooCommerceProducts(
        values.siteUrl,
        values.consumerKey,
        values.consumerSecret,
        page,
        10 // nombre de produits par page
      );
      
      setProductsList(products);
      setCurrentPage(page);
      setTotalPages(Math.ceil(products.length / 10)); // Estimation basique
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors de la récupération des produits");
    } finally {
      setIsFetchingProducts(false);
    }
  };

  // Importer les produits vers Supabase
  const handleImportProducts = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);
    
    try {
      // Simuler une progression pour l'UI
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 300);
      
      const result = await importWooCommerceProducts(productsList);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      
      if (result.success) {
        toast.success(`Importation réussie de ${result.totalImported} produits`);
      } else {
        toast.error(`Importation terminée avec des erreurs (${result.errors?.length} erreurs)`);
      }
    } catch (error) {
      console.error("Error importing products:", error);
      toast.error("Erreur lors de l'importation des produits");
      setImportProgress(0);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchProducts(form.getValues(), newPage);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleTestConnection)} className="space-y-4">
          <FormField
            control={form.control}
            name="siteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  URL de votre boutique WooCommerce
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://monsite.com" 
                    {...field} 
                    disabled={isConnected}
                  />
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
                    <Input 
                      placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx" 
                      type="password" 
                      {...field} 
                      disabled={isConnected}
                    />
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
                    <Input 
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx" 
                      type="password" 
                      {...field} 
                      disabled={isConnected}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              type="submit" 
              disabled={isConnecting || isConnected || isSaving} 
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
                "Tester la connexion"
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
                onClick={() => {
                  setIsConnected(false);
                  form.reset();
                }}
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
        <div className="mt-8 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Produits disponibles
            </h3>
            <Button 
              onClick={() => setImportDialogOpen(true)}
              disabled={productsList.length === 0 || isImporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Importer les produits
            </Button>
          </div>
          
          {isFetchingProducts ? (
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
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted text-sm font-medium">
                  <div className="col-span-6">Nom</div>
                  <div className="col-span-2">Prix</div>
                  <div className="col-span-4">Catégorie</div>
                </div>
                <div className="divide-y">
                  {productsList.map((product) => (
                    <div key={product.id} className="grid grid-cols-12 gap-2 p-3 text-sm items-center">
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
                      <div className="col-span-4">
                        {product.categories.length > 0 ? product.categories[0].name : "Non catégorisé"}
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
                  disabled={currentPage <= 1 || isFetchingProducts}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isFetchingProducts}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
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
                `Vous êtes sur le point d'importer ${productsList.length} produits dans votre catalogue.`
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
                    Importation en cours... {Math.round(importProgress)}%
                  </p>
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
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importation...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
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
