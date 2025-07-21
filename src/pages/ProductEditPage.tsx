
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ProductEditor from "@/components/catalog/ProductEditor";
import { useProductById } from "@/hooks/products/useProductById";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ProductEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  console.log("📄 ProductEditPage - Component mounted", { id, currentPath: window.location.pathname });

  // Validation de l'ID en paramètre
  useEffect(() => {
    console.log("📄 ProductEditPage - ID validation", { id });
    if (!id) {
      console.error("📄 ProductEditPage - No ID provided in URL");
      toast.error("ID de produit manquant");
      navigate("/admin/catalog");
      return;
    }
    console.log("📄 ProductEditPage - ID validation passed:", id);
  }, [id, navigate]);

  const { product, isLoading, error } = useProductById(id);

  console.log("📄 ProductEditPage - Data state", { 
    hasProduct: !!product, 
    isLoading, 
    hasError: !!error,
    productId: product?.id,
    productName: product?.name
  });

  // Marquer qu'on a tenté de charger
  useEffect(() => {
    if (!isLoading) {
      console.log("📄 ProductEditPage - Loading completed, setting hasAttemptedLoad");
      setHasAttemptedLoad(true);
    }
  }, [isLoading]);

  const handleProductUpdated = () => {
    console.log("📄 ProductEditPage - Product updated successfully");
    toast.success("Produit mis à jour avec succès");
    navigate("/admin/catalog");
  };

  const handleCancel = () => {
    console.log("📄 ProductEditPage - Cancel edit, navigating back to catalog");
    navigate("/admin/catalog");
  };

  // État de chargement initial
  if (isLoading) {
    console.log("📄 ProductEditPage - Showing loading state");
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="mr-4"
              >
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

  // État d'erreur après tentative de chargement
  if (hasAttemptedLoad && (error || !product)) {
    console.log("📄 ProductEditPage - Showing error state", { error: error?.message, hasProduct: !!product });
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="mr-4"
              >
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
              <Button variant="outline" onClick={() => navigate("/admin/catalog")}>
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

  // Rendu principal avec le produit chargé
  if (product) {
    console.log("📄 ProductEditPage - Rendering ProductEditor with product:", product.name);
    return (
      <PageTransition>
        <Container>
          <div className="py-6">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <h1 className="text-2xl font-bold">Modifier le produit: {product.name}</h1>
            </div>

            <ProductEditor
              isOpen={true}
              onClose={handleCancel}
              onSuccess={handleProductUpdated}
              productToEdit={product}
            />
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Fallback - ne devrait pas arriver
  console.log("📄 ProductEditPage - Fallback state reached");
  return (
    <PageTransition>
      <Container>
        <div className="flex items-center justify-center h-64">
          <span>Chargement...</span>
        </div>
      </Container>
    </PageTransition>
  );
};

export default ProductEditPage;
