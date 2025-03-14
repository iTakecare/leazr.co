
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getProducts, deleteProduct, getBrands } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Trash2, Edit, ArrowUpDown, SortAsc, SortDesc, Check } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AccordionProductListProps {
  products?: Product[];
  onProductDeleted?: () => void;
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";
type GroupingOption = "model" | "brand";

const AccordionProductList = ({ products: providedProducts, onProductDeleted }: AccordionProductListProps) => {
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [openVariants, setOpenVariants] = useState<Record<string, boolean>>({});
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [groupingOption, setGroupingOption] = useState<GroupingOption>("model");
  
  const { data: fetchedProducts = [], isLoading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: !providedProducts, // Only fetch products if they're not provided
  });
  
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const products = providedProducts || fetchedProducts;

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Produit supprimé avec succès");
      refetch();
      if (onProductDeleted) {
        onProductDeleted();
      }
    },
    onError: (err: Error) => {
      toast.error(`Erreur lors de la suppression du produit: ${err.message}`);
    },
  });

  const handleDeleteProduct = (id: string) => {
    deleteMutation.mutate(id);
    setProductToDelete(null);
  };
  
  const toggleVariants = (productId: string) => {
    setOpenVariants(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const sortProducts = (productsToSort: Product[]) => {
    const sorted = [...productsToSort];
    
    switch(sortOption) {
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "price-asc":
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price-desc":
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      default:
        return sorted;
    }
  };

  if (isLoading && !providedProducts) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun produit trouvé.</p>
      </div>
    );
  }

  const isParentProduct = (product: Product) => {
    return product.is_parent || (!product.parent_id && !product.is_variation);
  };

  const groupProductsByModel = () => {
    const parentProducts: Product[] = [];
    const variantsByParentId: Record<string, Product[]> = {};
    
    products.forEach(product => {
      if (isParentProduct(product)) {
        parentProducts.push(product);
        variantsByParentId[product.id] = [];
      }
    });
    
    products.forEach(product => {
      if (product.parent_id && variantsByParentId[product.parent_id]) {
        variantsByParentId[product.parent_id].push(product);
      } 
      else if (product.parent_id) {
        const parentExists = products.find(p => p.id === product.parent_id);
        if (parentExists) {
          if (!variantsByParentId[parentExists.id]) {
            variantsByParentId[parentExists.id] = [];
          }
          variantsByParentId[parentExists.id].push(product);
        } else {
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      }
      else if (product.is_variation) {
        const baseProductName = product.name.split(/\s+\d+\s*GB|\s+\d+Go|\s+\d+\s*To|\(/).shift()?.trim();
        if (baseProductName) {
          const potentialParent = parentProducts.find(
            p => p.name.toLowerCase().includes(baseProductName.toLowerCase())
          );
          if (potentialParent) {
            variantsByParentId[potentialParent.id].push(product);
          } else {
            parentProducts.push(product);
            variantsByParentId[product.id] = [];
          }
        } else {
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      }
    });
    
    const unassignedProducts = products.filter(
      p => !isParentProduct(p) && !Object.values(variantsByParentId).flat().includes(p)
    );
    
    unassignedProducts.forEach(product => {
      const baseProductName = product.name.split(/\s+\d+\s*GB|\s+\d+Go|\s+\d+\s*To|\(/).shift()?.trim();
      
      if (baseProductName) {
        const matchingParent = parentProducts.find(
          p => p.name.toLowerCase().includes(baseProductName.toLowerCase())
        );
        
        if (matchingParent) {
          variantsByParentId[matchingParent.id].push(product);
        } else {
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      } else {
        parentProducts.push(product);
        variantsByParentId[product.id] = [];
      }
    });
    
    parentProducts.forEach(parent => {
      if (parent.variants_ids && Array.isArray(parent.variants_ids)) {
        const variantsToAdd = products.filter(
          p => parent.variants_ids?.includes(p.id) && !variantsByParentId[parent.id].some(v => v.id === p.id)
        );
        
        if (variantsToAdd.length > 0) {
          variantsByParentId[parent.id] = [...variantsByParentId[parent.id], ...variantsToAdd];
        }
      }
    });
    
    return { parentProducts, variantsByParentId };
  };

  const groupProductsByBrand = () => {
    const brandGroups: Record<string, Product[]> = {};
    const sortedProducts = sortProducts(products);
    
    brands.forEach(brand => {
      brandGroups[brand.name] = [];
    });
    
    brandGroups["other"] = [];
    
    sortedProducts.forEach(product => {
      if (!product.is_parent && (product.is_variation || product.parent_id)) {
        const brandKey = product.brand || "other";
        if (brandGroups[brandKey]) {
          brandGroups[brandKey].push(product);
        } else {
          brandGroups[brandKey] = [product];
        }
      }
    });
    
    return brandGroups;
  };

  const { parentProducts, variantsByParentId } = groupProductsByModel();
  const brandGroups = groupProductsByBrand();

  const getBrandTranslation = (brandName: string) => {
    const brand = brands.find(b => b.name === brandName);
    return brand ? brand.translation : brandName;
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => productToDelete && handleDeleteProduct(productToDelete)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="flex justify-between items-center mb-4">
        <Tabs value={groupingOption} onValueChange={(value) => setGroupingOption(value as GroupingOption)}>
          <TabsList>
            <TabsTrigger value="model">Par modèle</TabsTrigger>
            <TabsTrigger value="brand">Par marque</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Trier
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <DropdownMenuRadioItem value="name-asc">
                <SortAsc className="h-4 w-4 mr-2" />
                Nom (A-Z)
                {sortOption === "name-asc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name-desc">
                <SortDesc className="h-4 w-4 mr-2" />
                Nom (Z-A)
                {sortOption === "name-desc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuRadioItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioItem value="price-asc">
                <SortAsc className="h-4 w-4 mr-2" />
                Prix (croissant)
                {sortOption === "price-asc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price-desc">
                <SortDesc className="h-4 w-4 mr-2" />
                Prix (décroissant)
                {sortOption === "price-desc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <TabsContent value="model" className="mt-0">
        <div className="space-y-4">
          {parentProducts.map((parentProduct) => {
            const variants = sortProducts(variantsByParentId[parentProduct.id] || []);
            const hasVariants = variants.length > 0;
            
            if (!hasVariants) {
              return null; // Skip parent products without variants
            }
            
            return (
              <motion.div key={parentProduct.id} variants={itemVariants}>
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-muted rounded overflow-hidden mr-3">
                        <img
                          src={parentProduct.image_url || parentProduct.imageUrl || '/placeholder.svg'}
                          alt={parentProduct.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      <div className="text-left font-medium">
                        {parentProduct.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/10 rounded-b-lg">
                    <div className="p-3 border-t border-muted">
                      <div className="space-y-2">
                        {variants.map((variant) => (
                          <div key={variant.id} className="p-3 bg-white rounded border border-muted hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-muted rounded overflow-hidden">
                                  <img
                                    src={variant.image_url || variant.imageUrl || '/placeholder.svg'}
                                    alt={variant.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                                    }}
                                  />
                                </div>
                                <div>
                                  <h3 className="font-medium">{variant.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(variant.price || 0)}
                                    {variant.variation_attributes && (
                                      <span className="ml-2">
                                        {Object.entries(variant.variation_attributes)
                                          .map(([key, value]) => `${key}: ${value}`)
                                          .join(', ')}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link to={`/products/${variant.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Modifier
                                  </Button>
                                </Link>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setProductToDelete(variant.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </TabsContent>
      
      <TabsContent value="brand" className="mt-0">
        <div className="space-y-4">
          {Object.entries(brandGroups).map(([brandName, brandProducts]) => {
            if (brandProducts.length === 0) return null;
            
            const sortedBrandProducts = sortProducts(brandProducts);
            
            return (
              <motion.div key={brandName} variants={itemVariants}>
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50">
                    <div className="flex items-center">
                      <div className="text-left font-medium">
                        {getBrandTranslation(brandName)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/10 rounded-b-lg">
                    <div className="p-3 border-t border-muted">
                      <div className="space-y-2">
                        {sortedBrandProducts.map((product) => (
                          <div key={product.id} className="p-3 bg-white rounded border border-muted hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-muted rounded overflow-hidden">
                                  <img
                                    src={product.image_url || product.imageUrl || '/placeholder.svg'}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                                    }}
                                  />
                                </div>
                                <div>
                                  <h3 className="font-medium">{product.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(product.price || 0)}
                                    {product.variation_attributes && (
                                      <span className="ml-2">
                                        {Object.entries(product.variation_attributes)
                                          .map(([key, value]) => `${key}: ${value}`)
                                          .join(', ')}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link to={`/products/${product.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Modifier
                                  </Button>
                                </Link>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setProductToDelete(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </TabsContent>
    </motion.div>
  );
};

export default AccordionProductList;
