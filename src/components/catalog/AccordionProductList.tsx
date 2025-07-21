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
import { Edit, Trash2, Package } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/catalog";

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
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
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

                  <div className="flex items-center gap-4">
                    {/* Price info */}
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(product.monthly_price || 0)}/mois
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Achat: {formatCurrency(product.price || 0)}
                      </div>
                    </div>
                    
                    {!readOnly && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/catalog/form/${product.id}`;
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProduct(product.id, product.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default AccordionProductList;
