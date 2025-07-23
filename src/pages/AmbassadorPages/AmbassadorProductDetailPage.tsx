import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Euro, Calendar, Truck, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Product } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";

const AmbassadorProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId } = useMultiTenant();

  // Extract product ID from the slug format (id-name)
  const productId = id?.split('-')[0];

  const fetchProductDetail = async (): Promise<Product | null> => {
    if (!productId) return null;

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        brands(id, name, translation),
        categories(id, name, translation)
      `)
      .eq("id", productId)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      throw error;
    }

    return {
      ...data,
      brand: data.brands?.name || data.brand,
      brand_translation: data.brands?.translation || data.brand,
      category: data.categories?.name || data.category,
      category_translation: data.categories?.translation || data.category,
    };
  };

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["ambassador-product-detail", productId],
    queryFn: fetchProductDetail,
    enabled: !!productId,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <Container className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-muted rounded" />
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-24" />
                <div className="h-8 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-16" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !product) {
    return (
      <PageTransition>
        <Container className="py-8">
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Produit non trouvé</h2>
            <p className="text-muted-foreground mb-6">
              Le produit demandé n'existe pas ou n'est plus disponible.
            </p>
            <Button onClick={() => navigate("/ambassador/products")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au catalogue
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container className="py-8 max-w-[1200px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/ambassador/products")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour au catalogue
          </Button>
        </div>

        {/* Product Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Image */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground" />
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
              
              <div className="flex items-center gap-4 mb-4">
                {product.brand && (
                  <Badge variant="secondary">
                    <Building className="h-3 w-3 mr-1" />
                    {product.brand}
                  </Badge>
                )}
                
                {product.category && (
                  <Badge variant="outline">
                    {product.category}
                  </Badge>
                )}
                
                <Badge variant={product.active ? "default" : "destructive"}>
                  {product.active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              {product.monthly_price && parseFloat(String(product.monthly_price)) > 0 ? (
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(parseFloat(String(product.monthly_price)))} / mois
                  </div>
                  {product.price && parseFloat(String(product.price)) > 0 && (
                    <div className="text-lg text-muted-foreground">
                      Prix d'achat: {formatPrice(parseFloat(String(product.price)))}
                    </div>
                  )}
                </div>
              ) : product.price && parseFloat(String(product.price)) > 0 ? (
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(parseFloat(String(product.price)))}
                </div>
              ) : (
                <div className="text-lg text-muted-foreground">Prix non défini</div>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Stock: {product.stock || 0} unité{(product.stock || 0) > 1 ? 's' : ''}
              </span>
              {product.stock && product.stock > 0 ? (
                <Badge variant="default" className="ml-2">En stock</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">Rupture</Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Description */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <ScrollArea className="h-40">
              <div className="text-muted-foreground whitespace-pre-wrap">
                {product.description || "Aucune description disponible."}
              </div>
            </ScrollArea>
          </div>

          {/* Technical Details */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Informations techniques</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Référence:</span>
                  <span>{product.id}</span>
                </div>
                
                {product.sku && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKU:</span>
                    <span>{product.sku}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>
                    {product.is_parent ? 'Produit parent' : 
                     product.parent_id ? 'Variante' : 'Produit simple'}
                  </span>
                </div>
                
                {product.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créé le:</span>
                    <span>{new Date(product.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Variant Information */}
            {product.variation_attributes && Object.keys(product.variation_attributes).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Attributs de variation</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(product.variation_attributes).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key}:</span>
                      <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorProductDetailPage;