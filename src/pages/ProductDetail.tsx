
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useProductById } from "@/hooks/products/useProductById";
import ProductSpecificationsTable from "@/components/product-detail/ProductSpecificationsTable";
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import { formatCurrency } from "@/utils/formatters";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, isLoading, error } = useProductById(id);
  
  const handleBackToCatalog = () => {
    navigate("/catalog");
  };
  
  if (isLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Chargement du produit...</h1>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (error || !product) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Erreur</h1>
              <Button onClick={handleBackToCatalog} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour au catalogue
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <h2 className="text-xl font-medium text-red-600 mb-2">Produit non trouvé</h2>
                  <p className="text-gray-500">
                    Le produit que vous recherchez n'existe pas ou a été supprimé.
                  </p>
                  <Button onClick={handleBackToCatalog} className="mt-6">
                    Retour au catalogue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <Button onClick={handleBackToCatalog} variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour au catalogue
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card className="overflow-hidden">
                <ProductImageDisplay 
                  imageUrl={product.image_url} 
                  altText={product.name} 
                />
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">{product.name}</h2>
                      <p className="text-gray-500">
                        {product.brand} • {product.category}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Prix d'achat</p>
                        <p className="text-xl font-bold">{formatCurrency(product.price)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Prix mensuel</p>
                        <p className="text-xl font-bold">
                          {product.monthly_price ? formatCurrency(product.monthly_price) : 'N/A'} / mois
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-gray-600">{product.description || "Aucune description disponible"}</p>
                    </div>
                    
                    <Separator />
                    
                    {product.specifications && Object.keys(product.specifications).length > 0 && (
                      <>
                        <div>
                          <h3 className="font-medium mb-2">Spécifications</h3>
                          <ProductSpecificationsTable specifications={product.specifications} />
                        </div>
                        
                        <Separator />
                      </>
                    )}
                    
                    <div className="flex gap-2">
                      <Button onClick={() => navigate(`/catalog?edit=${product.id}`)}>
                        Modifier ce produit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default ProductDetail;
