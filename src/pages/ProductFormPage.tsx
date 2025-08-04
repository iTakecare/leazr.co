import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductFormInfoTab from "@/components/catalog/ProductFormInfoTab";
import ProductFormImagesTab from "@/components/catalog/ProductFormImagesTab";
import ProductVariantManager from "@/components/catalog/ProductVariantManager";
import { DefaultVariantSelector } from "@/components/products/DefaultVariantSelector";
import { useProductById } from "@/hooks/products/useProductById";
import { Product } from "@/types/catalog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ProductFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const { navigateToAdmin } = useRoleNavigation();
  const [activeTab, setActiveTab] = useState("info");
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  
  const isEditMode = !!id;
  console.log("📄 ProductFormPage - Mode:", isEditMode ? "EDIT" : "CREATE", { id });

  // Only fetch product if in edit mode
  const { product, isLoading, error } = useProductById(isEditMode ? id : undefined);

  // Update current product when product changes
  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
    }
  }, [product]);

  console.log("📄 ProductFormPage - Data state", { 
    hasProduct: !!product, 
    isLoading, 
    hasError: !!error,
    isEditMode,
    productName: product?.name
  });

  // Mark that we attempted to load when not loading anymore
  useEffect(() => {
    if (!isLoading && isEditMode) {
      console.log("📄 ProductFormPage - Loading completed, setting hasAttemptedLoad");
      setHasAttemptedLoad(true);
    }
  }, [isLoading, isEditMode]);

  const handleBack = () => {
    console.log("📄 ProductFormPage - Navigating back to catalog");
    navigateToAdmin("catalog");
  };

  const handleSuccess = () => {
    console.log("📄 ProductFormPage - Operation successful");
    toast.success(isEditMode ? "Produit mis à jour avec succès" : "Produit créé avec succès");
    navigateToAdmin("catalog");
  };

  const handleImageUpdate = (imageUrl: string) => {
    console.log("📄 ProductFormPage - Image updated:", imageUrl);
    // The ProductImageManager handles the database update internally
    // This callback can be used for additional UI updates if needed
  };

  // Loading state for edit mode
  if (isEditMode && isLoading) {
    console.log("📄 ProductFormPage - Showing loading state");
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={handleBack} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <h1 className="text-2xl font-bold">Modifier le produit</h1>
            </div>
            
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Chargement du produit...</span>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Error state for edit mode
  if (isEditMode && hasAttemptedLoad && (error || !product)) {
    console.log("📄 ProductFormPage - Showing error state", { error: error?.message, hasProduct: !!product });
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={handleBack} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <h1 className="text-2xl font-bold">Modifier le produit</h1>
            </div>

            <Alert variant="destructive" className="max-w-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Produit introuvable</AlertTitle>
              <AlertDescription className="mt-2">
                {error 
                  ? `Erreur lors du chargement: ${error.message}`
                  : `Le produit avec l'ID "${id}" n'a pas été trouvé ou vous n'avez pas les permissions pour y accéder.`
                }
              </AlertDescription>
            </Alert>

            <div className="mt-6 space-x-2">
              <Button variant="outline" onClick={() => navigateToAdmin("catalog")}>
                Retour au catalogue
              </Button>
              {id && (
                <Button onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              )}
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Main render
  const pageTitle = isEditMode 
    ? `Modifier le produit: ${product?.name || ""}` 
    : "Créer un nouveau produit";

  console.log("📄 ProductFormPage - Rendering main form", { pageTitle, activeTab });

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={handleBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="variants">Variantes</TabsTrigger>
              <TabsTrigger value="defaults">Variante par défaut</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <ProductFormInfoTab 
                productToEdit={isEditMode ? product : undefined}
                isEditMode={isEditMode}
                brands={[]}
                categories={[]}
                onProductCreated={handleSuccess}
                onProductUpdated={handleSuccess}
              />
            </TabsContent>

            <TabsContent value="images">
              <ProductFormImagesTab 
                productToEdit={isEditMode ? product : undefined}
                isEditMode={isEditMode}
                onImageUpdate={handleImageUpdate}
              />
            </TabsContent>

            <TabsContent value="variants">
              {isEditMode && product ? (
                <ProductVariantManager 
                  product={product}
                  onSuccess={() => {
                    console.log("📄 ProductFormPage - Variants updated successfully");
                    toast.success("Variantes mises à jour avec succès");
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-medium mb-2">Variantes non disponibles</h3>
                    <p className="text-muted-foreground mb-4">
                      Les variantes ne peuvent être gérées qu'après la création du produit.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Créez d'abord le produit, puis revenez ici pour configurer ses variantes et attributs.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="defaults">
              {isEditMode && currentProduct ? (
                <DefaultVariantSelector 
                  product={currentProduct}
                  onUpdate={(updatedProduct) => {
                    console.log("📄 ProductFormPage - Default variant updated successfully");
                    setCurrentProduct(updatedProduct);
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-medium mb-2">Configuration non disponible</h3>
                    <p className="text-muted-foreground mb-4">
                      La variante par défaut ne peut être configurée qu'après la création du produit.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Créez d'abord le produit et configurez ses variantes, puis revenez ici pour définir la variante par défaut.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default ProductFormPage;
