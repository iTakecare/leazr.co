import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Download, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { FirecrawlService, CrawlResult } from "@/services/FirecrawlService";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";

interface AnalyzedProduct {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  monthly_price?: number;
  imageUrl?: string;
  specifications?: Record<string, any>;
}

export function FirecrawlImportForm() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CrawlResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  
  const createProductMutation = useCreateProduct();

  const handleAnalyzeCatalog = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const result = await FirecrawlService.analyzeCatalog();
      setAnalysisResult(result);
      
      if (result.success && result.products) {
        toast.success(`Analyse terminée ! ${result.totalFound} produits trouvés dans le catalogue iTakecare.`);
        // Sélectionner tous les produits par défaut
        setSelectedProducts(new Set(result.products.map((_, index) => index)));
      } else {
        toast.error(result.error || 'Erreur lors de l\'analyse du catalogue');
      }
    } catch (error) {
      console.error('Error analyzing catalog:', error);
      toast.error('Erreur lors de l\'analyse du catalogue');
      setAnalysisResult({
        success: false,
        error: 'Erreur lors de l\'analyse du catalogue'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImportProducts = async () => {
    if (!analysisResult?.products || selectedProducts.size === 0) {
      toast.error('Aucun produit sélectionné pour l\'import');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportedCount(0);

    const productsToImport = analysisResult.products.filter((_, index) => 
      selectedProducts.has(index)
    );

    try {
      for (let i = 0; i < productsToImport.length; i++) {
        const product = productsToImport[i];
        
        try {
          await createProductMutation.mutateAsync({
            name: product.name,
            brand: product.brand,
            category: product.category,
            description: product.description,
            price: product.price,
            monthly_price: product.monthly_price,
            image_url: product.imageUrl,
            specifications: product.specifications,
            active: true,
            is_refurbished: false,
            stock: 10, // Stock par défaut
          });
          
          setImportedCount(prev => prev + 1);
          toast.success(`Produit "${product.name}" importé avec succès`);
        } catch (error) {
          console.error(`Error importing product ${product.name}:`, error);
          toast.error(`Erreur lors de l'import de "${product.name}"`);
        }
        
        setImportProgress(Math.round(((i + 1) / productsToImport.length) * 100));
        
        // Pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast.success(`Import terminé ! ${importedCount} produits importés avec succès.`);
    } catch (error) {
      console.error('Error during import:', error);
      toast.error('Erreur lors de l\'import des produits');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleProductSelection = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const selectAllProducts = () => {
    if (analysisResult?.products) {
      setSelectedProducts(new Set(analysisResult.products.map((_, index) => index)));
    }
  };

  const deselectAllProducts = () => {
    setSelectedProducts(new Set());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Import du catalogue iTakecare
          </CardTitle>
          <CardDescription>
            Analysez et importez automatiquement les produits du catalogue iTakecare.be
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cette fonction va analyser le catalogue public d'iTakecare ({" "}
              <a 
                href="https://www.itakecare.be/catalogue/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                www.itakecare.be/catalogue/
              </a>
              ) et extraire automatiquement les informations des produits pour les importer dans votre base de données.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyzeCatalog}
              disabled={isAnalyzing || isImporting}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Analyser le catalogue
                </>
              )}
            </Button>

            {analysisResult?.success && analysisResult.products && (
              <Button 
                onClick={handleImportProducts}
                disabled={isImporting || selectedProducts.size === 0}
                variant="secondary"
                className="flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Importer {selectedProducts.size} produit(s)
                  </>
                )}
              </Button>
            )}
          </div>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import en cours...</span>
                <span>{importedCount} / {selectedProducts.size} produits importés</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résultats de l'analyse */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {analysisResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              Résultats de l'analyse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisResult.success ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.totalFound} produits trouvés dans le catalogue iTakecare
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllProducts}>
                      Tout sélectionner
                    </Button>
                    <Button size="sm" variant="outline" onClick={deselectAllProducts}>
                      Tout désélectionner
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analysisResult.products?.map((product: AnalyzedProduct, index) => (
                    <div 
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProducts.has(index) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleProductSelection(index)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{product.name}</h4>
                            <Badge variant="outline">{product.brand}</Badge>
                            <Badge variant="secondary">{product.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {product.description.substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium">
                              Prix: {product.price}€
                            </span>
                            {product.monthly_price && (
                              <span className="text-muted-foreground">
                                Mensuel: {product.monthly_price}€/mois
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          {selectedProducts.has(index) && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {analysisResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};