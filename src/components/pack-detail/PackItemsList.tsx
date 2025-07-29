import React from "react";
import { ProductPackItem } from "@/types/pack";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PackItemsListProps {
  items: ProductPackItem[];
}

const PackItemsList: React.FC<PackItemsListProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun produit dans ce pack
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        Produits inclus ({items.length} {items.length > 1 ? 'produits' : 'produit'})
      </h3>
      
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start gap-4">
              {/* Product Image */}
              <div className="flex-shrink-0">
                <img
                  src={item.product?.image_url || '/placeholder.svg'}
                  alt={item.product?.name || 'Produit'}
                  className="w-16 h-16 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-foreground truncate">
                      {item.product?.name || 'Produit sans nom'}
                    </h4>
                    
                    {item.product?.brand_name && (
                      <p className="text-sm text-muted-foreground">
                        {item.product.brand_name}
                      </p>
                    )}
                    
                    {item.product?.category_name && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {item.product.category_name}
                      </Badge>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-foreground">
                      Quantité: {item.quantity}
                    </div>
                    
                    {item.unit_monthly_price > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {item.unit_monthly_price.toFixed(2)}€/mois
                      </div>
                    )}
                  </div>
                </div>

                {item.product?.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {item.product.description}
                  </p>
                )}

                {/* Variant attributes if available */}
                {item.variant_price?.attributes && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(item.variant_price.attributes).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PackItemsList;