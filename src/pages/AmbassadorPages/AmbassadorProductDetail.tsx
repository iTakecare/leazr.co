
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Container from "@/components/layout/Container";
import { ArrowLeft, Layers, Check, Box, Info, Wrench, Shield, LifeBuoy, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/formatters";
import ProductDescription from "@/components/product-detail/ProductDescription";
import ProductSpecificationsTable from "@/components/product-detail/ProductSpecificationsTable";
import { motion } from "framer-motion";
import CO2SavingsCalculator from "@/components/product-detail/CO2SavingsCalculator";
import MainNavigation from "@/components/layout/MainNavigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";

const AmbassadorProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId!),
    enabled: !!productId,
  });

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="w-full bg-white shadow-sm">
          <Container maxWidth="7xl">
            <div className="py-6">
              <MainNavigation />
            </div>
          </Container>
        </div>
        <Container maxWidth="7xl">
          <div className="py-8 mt-24">
            <div className="flex items-center mb-6">
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-1/3" />
              </div>
            </div>
          </div>
        </Container>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <div className="w-full bg-white shadow-sm">
          <Container maxWidth="7xl">
            <div className="py-6">
              <MainNavigation />
            </div>
          </Container>
        </div>
        <Container maxWidth="7xl">
          <div className="py-8 mt-24">
            <div className="text-center p-8 border rounded-md">
              <p className="text-lg font-medium mb-2">Produit non trouvé</p>
              <p className="text-muted-foreground mb-4">Le produit que vous recherchez n'existe pas ou a été supprimé.</p>
              <Button onClick={() => navigate('/ambassador/catalog')}>Retour au catalogue</Button>
            </div>
          </div>
        </Container>
      </>
    );
  }

  const hasVariants = product.variation_attributes && 
                     Object.keys(product.variation_attributes).length > 0;

  const variants = product.variant_combination_prices || [];

  const isVariantAvailable = (variant: any) => {
    return variant && variant.active !== false;
  };

  return (
    <>
      <div className="w-full bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <MainNavigation />
        </div>
      </div>
      
      <div className="bg-white py-4 mt-24 border-b">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ambassador/catalog')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au catalogue
            </Button>
          </div>

          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/ambassador/catalog">Catalogue Ambassadeur</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/ambassador/catalog?category=${product.category}`}>
                {product.category === "laptop" ? "Ordinateurs" : product.category}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/ambassador/catalog?brand=${product.brand}`}>
                {product.brand}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <span className="truncate max-w-[200px] inline-block">{product.name}</span>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>
      </div>

      <Container maxWidth="7xl">
        <motion.div 
          className="py-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            <div className="lg:col-span-5">
              <ProductImageDisplay 
                imageUrl={product.image_url || '/placeholder.svg'} 
                altText={product.name}
              />
            </div>

            <div className="lg:col-span-7">
              {product.brand && (
                <p className="text-sm text-gray-500 font-medium mb-1">{product.brand}</p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold mb-3">{product.name}</h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {product.category && (
                  <Badge variant="outline" className="bg-gray-100">
                    {product.category}
                  </Badge>
                )}
                
                {hasVariants && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {variants.length} configuration{variants.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {product.category && (
                <div className="mb-5">
                  <CO2SavingsCalculator 
                    category={product.category} 
                    quantity={quantity}
                  />
                </div>
              )}

              <div className="mb-6">
                {product.monthly_price ? (
                  <div className="py-3 px-4 bg-blue-50 rounded-lg inline-block">
                    <span className="block text-sm text-gray-600 mb-1">Prix mensuel</span>
                    <span className="text-2xl font-bold text-blue-700">
                      {hasVariants ? "À partir de " : ""}
                      {formatCurrency(product.monthly_price)}
                      <span className="text-sm font-normal text-gray-500"> /mois</span>
                    </span>
                  </div>
                ) : null}
              </div>

              <Separator className="my-6" />

              <div className="bg-blue-50 border border-blue-100 rounded-md p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <Info className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800 mb-1">Information ambassadeur</h3>
                    <p className="text-sm text-blue-600">
                      Pour proposer ce produit à un client, utilisez l'outil "Calculateur" dans le menu. 
                      Vous pourrez y créer une offre personnalisée.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-green-500" />
                  <span>Maintenance incluse</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Garantie étendue</span>
                </div>
                <div className="flex items-center gap-3">
                  <Box className="h-5 w-5 text-green-500" />
                  <span>Livraison incluse</span>
                </div>
                <div className="flex items-center gap-3">
                  <LifeBuoy className="h-5 w-5 text-green-500" />
                  <span>Support technique</span>
                </div>
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-green-500" />
                  <span>Remplacement si panne</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="mb-6">
              <TabsTrigger value="details">Détails du produit</TabsTrigger>
              <TabsTrigger value="specs">Spécifications</TabsTrigger>
              {hasVariants && <TabsTrigger value="variants">Configurations</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="details">
              <ProductDescription 
                title="Description du produit" 
                description={product.description || ""}
              />
            </TabsContent>
            
            <TabsContent value="specs">
              <ProductSpecificationsTable 
                specifications={product.specifications || {}}
              />
            </TabsContent>
            
            <TabsContent value="variants">
              {hasVariants && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-medium text-lg mb-4">Configurations disponibles</h3>
                  <div className="space-y-4">
                    {variants.map((variant, index) => {
                      const variantAttributes = variant.attributes || {};
                      const isAvailable = isVariantAvailable(variant);
                      
                      return (
                        <div 
                          key={index}
                          className={`p-4 rounded-md border ${
                            isAvailable ? 'border-gray-200 hover:border-blue-300 cursor-default' : 
                            'border-gray-200 bg-gray-50 opacity-70'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between">
                            <div className="mb-2 md:mb-0">
                              <div className="font-medium">
                                {Object.entries(variantAttributes).map(([key, value], i, arr) => (
                                  <React.Fragment key={key}>
                                    <span>{key}: {String(value)}</span>
                                    {i < arr.length - 1 && <span className="mx-2 text-gray-400">|</span>}
                                  </React.Fragment>
                                ))}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Réf: {variant.sku || `VAR-${index + 1}`}
                              </div>
                            </div>
                            
                            <div className="flex flex-col">
                              {variant.monthly_price ? (
                                <div className="text-right">
                                  <div className="font-bold text-blue-600">
                                    {formatCurrency(variant.monthly_price)}
                                    <span className="text-sm font-normal text-gray-500">/mois</span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </Container>
    </>
  );
};

export default AmbassadorProductDetail;
