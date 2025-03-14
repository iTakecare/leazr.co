
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

interface AccordionProductListProps {
  products?: Product[];
  onProductDeleted?: () => void;
  groupingOption: "model" | "brand";
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

const AccordionProductList = ({ 
  products: providedProducts, 
  onProductDeleted,
  groupingOption = "model" 
}: AccordionProductListProps) => {
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  
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
  
  console.log("Products loaded:", products.length, "items");
  if (products.length > 0) {
    console.log("Sample product:", products[0]);
  }

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
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
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

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground mb-2">Aucun produit trouvé.</p>
        <p className="text-sm text-muted-foreground">
          Ajoutez des produits en cliquant sur le bouton "Ajouter un produit" ou importez-les depuis WooCommerce.
        </p>
      </div>
    );
  }

  // Function to check if a product is a parent product
  const isParentProduct = (product: Product) => {
    return product.is_parent || (!product.parent_id && !product.is_variation);
  };

  // Group products by model
  const groupProductsByModel = () => {
    const parentProducts: Product[] = [];
    const variantsByParentId: Record<string, Product[]> = {};
    
    // First gather all parent products
    products.forEach(product => {
      if (isParentProduct(product)) {
        parentProducts.push(product);
        variantsByParentId[product.id] = [];
      }
    });
    
    // Then assign variants to their parents
    products.forEach(product => {
      if (product.parent_id && variantsByParentId[product.parent_id]) {
        variantsByParentId[product.parent_id].push(product);
      } 
      else if (product.parent_id) {
        // If parent exists in products but wasn't processed yet
        const parentExists = products.find(p => p.id === product.parent_id);
        if (parentExists) {
          if (!variantsByParentId[parentExists.id]) {
            variantsByParentId[parentExists.id] = [];
          }
          variantsByParentId[parentExists.id].push(product);
        } else {
          // If parent doesn't exist, treat as standalone
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      }
      else if (!isParentProduct(product)) {
        // If it's a variant without a parent, add it to a parent with similar name
        const baseProductName = product.name.split(/\s+\d+\s*GB|\s+\d+Go|\s+\d+\s*To|\(/).shift()?.trim();
        if (baseProductName) {
          const potentialParent = parentProducts.find(
            p => p.name.toLowerCase().includes(baseProductName.toLowerCase())
          );
          if (potentialParent) {
            variantsByParentId[potentialParent.id].push(product);
          } else {
            // If no matching parent, treat as standalone
            parentProducts.push(product);
            variantsByParentId[product.id] = [];
          }
        } else {
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      }
    });
    
    // Add products that weren't added as parents or variants
    const processedProductIds = [
      ...parentProducts.map(p => p.id),
      ...Object.values(variantsByParentId).flat().map(v => v.id)
    ];
    
    const remainingProducts = products.filter(
      p => !processedProductIds.includes(p.id)
    );
    
    remainingProducts.forEach(product => {
      parentProducts.push(product);
      variantsByParentId[product.id] = [];
    });
    
    return { parentProducts: sortProducts(parentProducts), variantsByParentId };
  };

  // Group products by brand
  const groupProductsByBrand = () => {
    const brandGroups: Record<string, Product[]> = {};
    
    // Initialize brand groups including "other"
    brands.forEach(brand => {
      brandGroups[brand.name] = [];
    });
    
    // Add "other" category
    brandGroups["other"] = [];
    
    // Sort products into brand groups
    products.forEach(product => {
      // Assign to appropriate brand
      const brandKey = product.brand || "other";
      if (brandGroups[brandKey]) {
        brandGroups[brandKey].push(product);
      } else {
        // If brand doesn't exist in our groups, add it
        brandGroups[brandKey] = [product];
      }
    });
    
    // Sort products in each brand
    Object.keys(brandGroups).forEach(brandKey => {
      brandGroups[brandKey] = sortProducts(brandGroups[brandKey]);
    });
    
    // Filter out empty brand groups
    const filteredBrandGroups: Record<string, Product[]> = {};
    Object.entries(brandGroups).forEach(([brandKey, brandProducts]) => {
      if (brandProducts.length > 0) {
        filteredBrandGroups[brandKey] = brandProducts;
      }
    });
    
    return filteredBrandGroups;
  };

  const { parentProducts, variantsByParentId } = groupProductsByModel();
  const brandGroups = groupProductsByBrand();

  // Log grouping results for debugging
  console.log("Grouping by model:", 
    parentProducts.length, "parent products", 
    Object.values(variantsByParentId).flat().length, "variants"
  );
  
  console.log("Grouping by brand:", 
    Object.keys(brandGroups).length, "brands", 
    Object.values(brandGroups).flat().length, "products"
  );

  const getBrandTranslation = (brandName: string) => {
    const brand = brands.find(b => b.name === brandName);
    return brand ? brand.translation : brandName;
  };

  const renderProductItem = (product: Product) => (
    <motion.div key={product.id} variants={itemVariants}>
      <div className="border rounded-md p-3 mb-2 bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden">
              <img
                src={product.image_url || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            <div>
              <h3 className="font-medium text-sm">{product.name}</h3>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-2">{formatCurrency(product.price || 0)}</span>
                {product.monthly_price ? (
                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                    {formatCurrency(product.monthly_price)}/mois
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/products/${product.id}`}>
              <Button variant="outline" size="sm">
                <Edit className="h-3.5 w-3.5 mr-1" />
                Modifier
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setProductToDelete(product.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );

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
      
      <div className="flex justify-end items-center mb-4">
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

      {groupingOption === "model" ? (
        <div className="space-y-6">
          {parentProducts.map((parentProduct) => {
            const variants = variantsByParentId[parentProduct.id] || [];
            const hasVariants = variants.length > 0;
            
            if (!hasVariants) {
              return renderProductItem(parentProduct);
            }
            
            return (
              <motion.div key={parentProduct.id} variants={itemVariants} className="mb-4">
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white rounded-md overflow-hidden mr-3 border">
                        <img
                          src={parentProduct.image_url || '/placeholder.svg'}
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
                  
                  <div className="p-3">
                    <div className="space-y-2">
                      {variants.map(renderProductItem)}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(brandGroups).map(([brandName, brandProducts]) => (
            <motion.div key={brandName} variants={itemVariants} className="mb-4">
              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="flex items-center">
                    <span className="font-medium">{getBrandTranslation(brandName)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({brandProducts.length} produit{brandProducts.length > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="space-y-2">
                    {brandProducts.map(renderProductItem)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AccordionProductList;
