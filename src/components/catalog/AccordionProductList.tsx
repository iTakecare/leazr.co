import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package, Leaf } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/catalog";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useBulkCO2Calculator } from "@/hooks/environmental/useBulkCO2Calculator";

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
  
  // Calculate CO2 data for all products at once
  const { products: co2Results, isLoading: co2Loading } = useBulkCO2Calculator({
    products: products.map(p => ({
      id: p.id,
      category: p.category
    }))
  });

  // Image URL helpers
  const isSupabaseUrl = (url: string) => url.includes('supabase.co/storage');

  const cleanImageUrl = (raw?: string | null): string => {
    if (!raw) return "";
    let url = raw.trim();

    // Base64: return as-is
    if (url.startsWith('data:image')) return url;

    // Support http -> https
    if (url.startsWith('http://')) {
      url = 'https://' + url.substring(7);
    }

    // Encode spaces minimally
    url = url.replace(/ /g, '%20');

    // Clean double slashes on Supabase URLs (but not the protocol part)
    if (isSupabaseUrl(url)) {
      url = url.replace(/([^:])\/{2,}/g, '$1/');
    }

    return url;
  };

  const addTimestamp = (url: string): string => {
    if (!url) return url;
    if (url === '/placeholder.svg') return url;
    if (url.startsWith('data:image')) return url;
    if (isSupabaseUrl(url)) return url; // avoid breaking signed/public storage URLs
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${Date.now()}`;
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${productName}" ?`)) {
      onProductDeleted(productId);
    }
  };

  return (
    <div className="space-y-4">
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
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    {/* Product image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {hasImageSrc ? (
                        <img
                          src={addTimestamp(cleanImageUrl(rawImageUrl))}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.log(`❌ AccordionProductList: Erreur image pour ${product.name}: ${rawImageUrl}`);
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-left">{product.name}</h3>
                        {hasVariants && (
                          <Badge variant="secondary" className="text-xs">
                            {existingVariantsCount} variante{existingVariantsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {co2Results[product.id] && co2Results[product.id].co2Kg > 0 && (
                          <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                            <Leaf className="h-3 w-3 mr-1" />
                            -{co2Results[product.id].co2Kg} kg CO2
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{product.brand}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>{product.category}</span>
                        {!product.active && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <Badge variant="destructive" className="text-xs">
                              Inactif
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price info */}
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(product.monthly_price || 0)}/mois
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Achat: {formatCurrency(product.price || 0)}
                    </div>
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
  );
};

export default AccordionProductList;
