import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package, Leaf, Copy } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { getMinimumMonthlyPrice, hasVariantPricing } from "@/utils/productPricing";
import { Product } from "@/types/catalog";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useBulkCO2Calculator } from "@/hooks/environmental/useBulkCO2Calculator";
import { useDuplicateProduct } from "@/hooks/products/useDuplicateProduct";
import ProductDuplicationDialog from "./ProductDuplicationDialog";

// Gabarit de colonnes partagé entre l'en-tête et chaque ligne produit.
// Template unique (5 colonnes) + min-width : sur écran étroit la liste défile
// horizontalement plutôt que de casser l'alignement des colonnes.
const COLS =
  "grid grid-cols-[minmax(0,1.6fr)_140px_minmax(0,1.4fr)_130px_160px] gap-4 items-center min-w-[820px]";

interface AccordionProductListProps {
  products: Product[];
  onProductDeleted: (productId: string) => void;
  readOnly?: boolean;
}

const AccordionProductList: React.FC<AccordionProductListProps> = ({
  products,
  onProductDeleted,
  readOnly = false,
}) => {
  const { navigateToAdmin } = useRoleNavigation();
  const [productToDuplicate, setProductToDuplicate] = useState<Product | null>(null);
  const [duplicationDialogOpen, setDuplicationDialogOpen] = useState(false);
  
  const { mutate: duplicateProduct, isPending: isDuplicating } = useDuplicateProduct();
  
  // Calculate CO2 data for all products at once
  const { products: co2Results, isLoading: co2Loading } = useBulkCO2Calculator({
    products: products.map(p => ({
      id: p.id,
      category: p.category
    }))
  });

  // Simple image URL helper - use URLs exactly as stored in database
  const getImageUrl = (raw?: string | null): string => {
    if (!raw || raw.trim() === '') return '/placeholder.svg';
    
    // Base64: return as-is
    if (raw.startsWith('data:image')) return raw;
    
    // All other URLs (Supabase or external): return exactly as-is
    return raw;
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${productName}" ?`)) {
      onProductDeleted(productId);
    }
  };
  
  const handleDuplicateClick = (product: Product) => {
    setProductToDuplicate(product);
    setDuplicationDialogOpen(true);
  };
  
  const handleDuplicateConfirm = (options: {
    copyImages: boolean;
    copyUpsells: boolean;
    copyVariantPrices: boolean;
    nameSuffix: string;
  }) => {
    if (!productToDuplicate) return;
    
    duplicateProduct({
      productId: productToDuplicate.id,
      ...options
    }, {
      onSuccess: () => {
        setDuplicationDialogOpen(false);
        setProductToDuplicate(null);
      }
    });
  };

  return (
    <>
      <ProductDuplicationDialog
        product={productToDuplicate}
        open={duplicationDialogOpen}
        onOpenChange={setDuplicationDialogOpen}
        onConfirm={handleDuplicateConfirm}
        isLoading={isDuplicating}
      />
      
      <div className="space-y-4 overflow-x-auto">
        {/* En-tête de colonnes */}
        <div className={`${COLS} px-4 pr-10 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
          <span>Produit</span>
          <span>SKU client</span>
          <span>Descriptif</span>
          <span>Marque</span>
          <span className="text-right">Prix (à partir de)</span>
        </div>
        <Accordion type="multiple" className="w-full space-y-2">
        {products.map((product) => {
          const hasVariants = product.has_variants || (product.variants && product.variants.length > 0) || (product.variant_combination_prices && product.variant_combination_prices.length > 0);
          const existingVariantsCount = (product.variants ? product.variants.length : 0) + (product.variant_combination_prices ? product.variant_combination_prices.length : 0);

          // Compute image URL candidates safely (supports optional image_urls array)
          const rawImageUrl: string | undefined = product.image_url || (product as any)?.image_urls?.[0];
          const hasImageSrc = !!rawImageUrl;

          return (
            <AccordionItem
              key={product.id}
              value={product.id}
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className={`${COLS} w-full`}>
                  {/* Produit : image + nom */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {hasImageSrc ? (
                        <img
                          src={getImageUrl(rawImageUrl)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            console.log(`❌ Image error for ${product.name}: ${rawImageUrl}`);
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-1 min-w-0">
                      <h3 className="font-medium text-left truncate w-full">{product.name}</h3>
                      <div className="flex flex-wrap items-center gap-1">
                        {hasVariants && (
                          <Badge variant="secondary" className="text-xs">
                            {existingVariantsCount} variante{existingVariantsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {!product.active && (
                          <Badge variant="destructive" className="text-xs">Inactif</Badge>
                        )}
                        {co2Results[product.id] && co2Results[product.id].co2Kg > 0 && (
                          <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                            <Leaf className="h-3 w-3 mr-1" />
                            -{co2Results[product.id].co2Kg} kg CO2
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SKU client */}
                  <div className="text-left text-xs font-mono text-muted-foreground truncate">
                    {product.sku_itc || product.sku || <span className="opacity-40">—</span>}
                  </div>

                  {/* Descriptif */}
                  <div className="text-left text-sm text-muted-foreground truncate">
                    {product.short_description || product.description || <span className="opacity-40">—</span>}
                  </div>

                  {/* Marque · Catégorie */}
                  <div className="flex flex-col items-start text-sm min-w-0">
                    <span className="truncate w-full">{product.brand || "—"}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">{product.category || ""}</span>
                  </div>

                  {/* Prix (à partir de) */}
                  <div className="text-right">
                    {(() => {
                      const variants = hasVariantPricing(product);
                      const monthly = variants ? getMinimumMonthlyPrice(product) : (product.monthly_price || 0);
                      return (
                        <>
                          {variants && (
                            <div className="text-[10px] text-muted-foreground leading-none">à partir de</div>
                          )}
                          <div className="font-medium">{formatCurrency(monthly)}/mois</div>
                          <div className="text-xs text-muted-foreground">Achat: {formatCurrency(product.price || 0)}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                  
                  {!readOnly && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-2"
                        onClick={() => {
                          navigateToAdmin(`catalog/form/${product.id}`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => handleDuplicateClick(product)}
                        disabled={isDuplicating}
                      >
                        <Copy className="h-4 w-4" />
                        Dupliquer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          handleDeleteProduct(product.id, product.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
        </Accordion>
      </div>
    </>
  );
};

export default AccordionProductList;
