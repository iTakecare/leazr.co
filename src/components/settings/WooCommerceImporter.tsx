
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, AlertCircle, Check, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import {
  testWooCommerceConnection,
  saveWooCommerceConfig,
  getWooCommerceConfig,
  importWooCommerceProducts,
} from "@/services/woocommerceService";

// Types pour l'état d'importation
interface ImportState {
  status: "idle" | "connecting" | "fetching" | "importing" | "completed" | "error";
  message: string;
  current: number;
  total: number;
  products: any[];
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

const WooCommerceImporter = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const [siteUrl, setSiteUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [includeVariations, setIncludeVariations] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [importState, setImportState] = useState<ImportState>({
    status: "idle",
    message: "",
    current: 0,
    total: 0,
    products: [],
    importedCount: 0,
    skippedCount: 0,
    errors: [],
  });

  // Charger la configuration enregistrée
  React.useEffect(() => {
    const loadConfig = async () => {
      if (user?.id) {
        const config = await getWooCommerceConfig(user.id);
        if (config) {
          setSiteUrl(config.site_url || "");
          setConsumerKey(config.consumer_key || "");
          setConsumerSecret(config.consumer_secret || "");
          setConfigSaved(true);
        }
      }
    };
    loadConfig();
  }, [user?.id]);

  // Tester la connexion à WooCommerce
  const testConnection = async () => {
    if (!siteUrl || !consumerKey || !consumerSecret) {
      toast({
        title: "Données manquantes",
        description: "Veuillez remplir tous les champs de connexion",
        variant: "destructive",
      });
      return;
    }

    try {
      setImportState({
        ...importState,
        status: "connecting",
        message: "Test de connexion en cours...",
      });

      // Vérifier si la table products a les bonnes colonnes
      const { data: columnInfo, error: columnError } = await supabase
        .rpc('get_table_columns', { table_name: 'products' });
      
      if (columnError) {
        console.error('Erreur lors de la vérification des colonnes:', columnError);
        
        // Créer la fonction RPC si elle n'existe pas
        try {
          const { error: rpcError } = await supabase.rpc('create_table_columns_function');
          console.log('Création de la fonction pour vérifier les colonnes:', rpcError ? 'échec' : 'succès');
        } catch (e) {
          console.error('Échec de la création de la fonction RPC:', e);
        }
      } else {
        console.log('Colonnes de la table products:', columnInfo);
      }

      // Tester la connexion WooCommerce
      const isConnected = await testWooCommerceConnection(siteUrl, consumerKey, consumerSecret);

      if (isConnected) {
        setConnectionTested(true);
        setImportState({
          ...importState,
          status: "idle",
          message: "Connexion réussie",
        });
        toast({
          title: "Connexion réussie",
          description: "La connexion à WooCommerce a été établie avec succès.",
        });

        // Sauvegarder les identifiants si connecté
        if (user?.id) {
          const saved = await saveWooCommerceConfig(user.id, {
            siteUrl,
            consumerKey,
            consumerSecret,
          });

          if (saved) {
            setConfigSaved(true);
          }
        }
      } else {
        setImportState({
          ...importState,
          status: "error",
          message: "Échec de la connexion",
        });
        toast({
          title: "Échec de la connexion",
          description:
            "Impossible de se connecter à l'API WooCommerce. Vérifiez vos identifiants.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur lors du test de connexion:", error);
      setImportState({
        ...importState,
        status: "error",
        message: "Erreur lors du test de connexion",
      });
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du test de connexion.",
        variant: "destructive",
      });
    }
  };

  // Récupérer les produits de WooCommerce
  const fetchProducts = async () => {
    try {
      setImportState({
        ...importState,
        status: "fetching",
        message: "Récupération des produits...",
        current: 0,
        total: 0,
        products: [],
      });

      // Appel direct à la fonction edge de Supabase pour récupérer les produits
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woocommerce-import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: "getProducts",
            url: siteUrl,
            consumerKey: consumerKey,
            consumerSecret: consumerSecret,
            page: 1,
            perPage: 100,
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        console.error("Erreur lors de la récupération des produits:", result.error);
        setImportState({
          ...importState,
          status: "error",
          message: `Erreur: ${result.error}`,
        });
        return;
      }

      if (!result.products || !Array.isArray(result.products)) {
        setImportState({
          ...importState,
          status: "error",
          message: "Format de réponse invalide",
        });
        return;
      }

      console.log(`${result.products.length} produits récupérés`);

      setImportState({
        ...importState,
        status: "idle",
        message: `${result.products.length} produits récupérés`,
        products: result.products,
        total: result.products.length,
      });

      toast({
        title: "Produits récupérés",
        description: `${result.products.length} produits ont été récupérés avec succès.`,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des produits:", error);
      setImportState({
        ...importState,
        status: "error",
        message: "Erreur lors de la récupération des produits",
      });
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la récupération des produits.",
        variant: "destructive",
      });
    }
  };

  // Récupérer tous les produits WooCommerce
  const fetchAllProducts = async () => {
    try {
      setImportState({
        ...importState,
        status: "fetching",
        message: "Récupération de tous les produits...",
        current: 0,
        total: 0,
        products: [],
      });

      let page = 1;
      const perPage = 100;
      let allProducts: any[] = [];
      let hasMoreProducts = true;

      while (hasMoreProducts) {
        setImportState((prev) => ({
          ...prev,
          message: `Récupération de la page ${page}...`,
        }));

        // Appel direct à la fonction edge de Supabase
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woocommerce-import`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: "getProducts",
              url: siteUrl,
              consumerKey: consumerKey,
              consumerSecret: consumerSecret,
              page,
              perPage,
            }),
          }
        );

        const result = await response.json();

        if (result.error) {
          console.error("Erreur lors de la récupération des produits:", result.error);
          break;
        }

        if (!result.products || !Array.isArray(result.products) || result.products.length === 0) {
          hasMoreProducts = false;
        } else {
          allProducts = [...allProducts, ...result.products];
          page++;
        }
      }

      console.log(`${allProducts.length} produits récupérés au total`);

      setImportState({
        ...importState,
        status: "idle",
        message: `${allProducts.length} produits récupérés`,
        products: allProducts,
        total: allProducts.length,
      });

      toast({
        title: "Produits récupérés",
        description: `${allProducts.length} produits ont été récupérés au total.`,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération de tous les produits:", error);
      setImportState({
        ...importState,
        status: "error",
        message: "Erreur lors de la récupération des produits",
      });
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la récupération des produits.",
        variant: "destructive",
      });
    }
  };

  // Importer les produits dans la base de données
  const importProducts = async () => {
    try {
      if (importState.products.length === 0) {
        toast({
          title: "Aucun produit à importer",
          description: "Veuillez d'abord récupérer les produits.",
          variant: "destructive",
        });
        return;
      }

      setImportState((prev) => ({
        ...prev,
        status: "importing",
        message: "Importation des produits...",
        current: 0,
        importedCount: 0,
        skippedCount: 0,
        errors: [],
      }));

      console.log(`Starting import with overwriteExisting: ${overwriteExisting}`);

      // Vérifier/créer le bucket de stockage pour les images de produits
      await ensureStorageBucketExists("product-images");

      const batchSize = 5;
      const totalBatches = Math.ceil(importState.products.length / batchSize);
      let totalImported = 0;
      let totalSkipped = 0;
      let allErrors: string[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, importState.products.length);
        const batch = importState.products.slice(start, end);

        setImportState((prev) => ({
          ...prev,
          message: `Importation du lot ${i + 1}/${totalBatches}...`,
          current: start,
        }));

        const result = await importWooCommerceProducts(
          batch,
          includeVariations,
          overwriteExisting
        );

        totalImported += result.totalImported;
        totalSkipped += result.skipped;

        if (result.errors && result.errors.length > 0) {
          allErrors = [...allErrors, ...result.errors];
        }

        setImportState((prev) => ({
          ...prev,
          importedCount: totalImported,
          skippedCount: totalSkipped,
          errors: allErrors,
        }));
      }

      setImportState((prev) => ({
        ...prev,
        status: allErrors.length > 0 ? "error" : "completed",
        message: allErrors.length > 0
          ? "Importation terminée avec des erreurs."
          : "Importation terminée avec succès.",
        current: importState.products.length,
        importedCount: totalImported,
        skippedCount: totalSkipped,
        errors: allErrors,
      }));

      toast({
        title: allErrors.length > 0 ? "Importation terminée avec des erreurs" : "Importation terminée",
        description: `${totalImported} produits importés, ${totalSkipped} produits ignorés.`,
        variant: allErrors.length > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Erreur lors de l'importation des produits:", error);
      setImportState((prev) => ({
        ...prev,
        status: "error",
        message: "Erreur lors de l'importation des produits",
        errors: [...prev.errors, (error as Error).message],
      }));
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'importation des produits.",
        variant: "destructive",
      });
    }
  };

  // S'assurer que le bucket de stockage existe
  const ensureStorageBucketExists = async (bucketName: string) => {
    try {
      console.log(`Vérification/création du bucket de stockage: ${bucketName}`);
      
      // Vérifier si le bucket existe
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Erreur lors de la vérification du bucket:", error);
        throw error;
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Le bucket ${bucketName} n'existe pas, tentative de création...`);
        
        // Essayer de créer le bucket directement
        try {
          const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true
          });
          
          if (createError) {
            console.error("Erreur lors de la création directe du bucket:", createError);
            
            // Approche alternative - utiliser RPC
            try {
              const { error: rpcError } = await supabase.rpc('create_storage_bucket', {
                bucket_name: bucketName
              });
              
              if (rpcError) {
                console.error("Échec de l'approche alternative:", rpcError);
              }
            } catch (e) {
              console.error("Exception lors de l'appel RPC:", e);
            }
          }
        } catch (e) {
          console.error("Exception lors de la vérification/création du bucket:", e);
        }
      }
    } catch (error) {
      console.error("Error ensuring storage bucket exists, continuing anyway:", error);
    }
  };

  // Afficher le pourcentage de progression
  const getProgressPercentage = () => {
    if (importState.total === 0) return 0;
    return Math.round((importState.current / importState.total) * 100);
  };

  // Désactiver les boutons pendant le chargement
  const isLoading = ["connecting", "fetching", "importing"].includes(importState.status);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-url">URL du site WooCommerce</Label>
                <Input
                  id="site-url"
                  placeholder="https://votre-site.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumer-key">Clé API (Consumer Key)</Label>
                <Input
                  id="consumer-key"
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxx"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumer-secret">Secret API (Consumer Secret)</Label>
                <Input
                  id="consumer-secret"
                  type="password"
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxx"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={testConnection}
                disabled={isLoading || !siteUrl || !consumerKey || !consumerSecret}
                variant="outline"
                className="w-full"
              >
                {importState.status === "connecting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  "Tester la connexion"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-variations">Inclure les variations</Label>
                <Switch
                  id="include-variations"
                  checked={includeVariations}
                  onCheckedChange={setIncludeVariations}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="overwrite-existing">Écraser les produits existants</Label>
                <Switch
                  id="overwrite-existing"
                  checked={overwriteExisting}
                  onCheckedChange={setOverwriteExisting}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={fetchProducts}
                  disabled={isLoading || !connectionTested}
                  variant="outline"
                  className="w-full"
                >
                  {importState.status === "fetching" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Récupération...
                    </>
                  ) : (
                    "Récupérer les produits (page 1)"
                  )}
                </Button>

                <Button
                  onClick={fetchAllProducts}
                  disabled={isLoading || !connectionTested}
                  variant="outline"
                  className="w-full"
                >
                  {importState.status === "fetching" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Récupération...
                    </>
                  ) : (
                    "Récupérer tous les produits"
                  )}
                </Button>

                <Button
                  onClick={importProducts}
                  disabled={isLoading || importState.products.length === 0}
                  className="w-full"
                >
                  {importState.status === "importing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importation en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importer {importState.products.length} produits
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {importState.status !== "idle" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {importState.status === "connecting" && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
                {importState.status === "fetching" && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
                {importState.status === "importing" && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
                {importState.status === "completed" && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {importState.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-base font-medium">{importState.message}</span>
              </div>

              {["importing", "fetching"].includes(importState.status) && (
                <div className="space-y-2">
                  <Progress value={getProgressPercentage()} />
                  <p className="text-sm text-gray-500 text-right">
                    {importState.current} / {importState.total} (
                    {getProgressPercentage()}%)
                  </p>
                </div>
              )}

              {importState.status === "completed" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-sm font-medium text-green-800">
                      Produits importés
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {importState.importedCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-3 text-center">
                    <p className="text-sm font-medium text-yellow-800">
                      Produits ignorés
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {importState.skippedCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-sm font-medium text-red-800">Erreurs</p>
                    <p className="text-2xl font-bold text-red-600">
                      {importState.errors.length}
                    </p>
                  </div>
                </div>
              )}

              {importState.status === "error" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-sm font-medium text-green-800">
                      Produits importés
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {importState.importedCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-3 text-center">
                    <p className="text-sm font-medium text-yellow-800">
                      Produits ignorés
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {importState.skippedCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-sm font-medium text-red-800">Erreurs</p>
                    <p className="text-2xl font-bold text-red-600">
                      {importState.errors.length}
                    </p>
                  </div>
                </div>
              )}

              {importState.errors.length > 0 && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="errors">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span>
                          {importState.errors.length} erreur(s) détectée(s)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-red-50 rounded border border-red-200">
                        <ul className="list-disc pl-5 space-y-1">
                          {importState.errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-700">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {importState.status === "importing" && (
                <p className="text-sm text-gray-500">
                  L'importation peut prendre plusieurs minutes en fonction du
                  nombre de produits.
                </p>
              )}

              {importState.status === "completed" && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setImportState({
                        ...importState,
                        status: "idle",
                      })
                    }
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nouvelle importation
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WooCommerceImporter;
