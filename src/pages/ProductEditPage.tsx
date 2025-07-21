
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

  // Debug logging
  useEffect(() => {
    console.log("ProductEditPage - Mounted with ID:", id);
    console.log("ProductEditPage - Current route:", window.location.pathname);
  }, [id]);

  const { product, isLoading, error } = useProductById(id);

  // Track when we've attempted to load
  useEffect(() => {
    if (!isLoading) {
      setHasAttemptedLoad(true);
    }
  }, [isLoading]);

  // Handle navigation validation
  useEffect(() => {
    if (!id) {
      console.error("ProductEditPage - No ID provided");
      toast.error("ID de produit manquant");
      navigate("/admin/catalog");
      return;
    }
  }, [id, navigate]);

  const handleProductUpdated = () => {
    console.log("ProductEditPage - Product updated successfully");
    toast.success("Produit mis à jour avec succès");
    navigate("/admin/catalog");
  };

  const handleCancel = () => {
    console.log("ProductEditPage - Cancel edit, navigating back to catalog");
    navigate("/admin/catalog");
  };

  // Show loading state
  if (isLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement du produit...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Show error state if there's an error or product not found after loading
  if (hasAttemptedLoad && (error || !product)) {
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

  // Render the product editor if everything is loaded successfully
  if (product) {
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

  // Fallback - should not reach here, but just in case
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
