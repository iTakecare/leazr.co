
import React from 'react';
import { Product } from '@/types/catalog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Layers } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Separator } from '@/components/ui/separator';
import VariantIndicator from '@/components/ui/product/VariantIndicator';
import { useNavigate } from 'react-router-dom';

interface ProductGridProps {
  products: Product[];
  groupBy?: "brand" | "category";
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  readOnly?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  groupBy = "category",
  onEdit,
  onDelete,
  readOnly = false
}) => {
  const navigate = useNavigate();
  
  // Group by specified property (brand or category)
  const groupedProducts = products.reduce((acc, product) => {
    const groupKey = groupBy === "brand" ? 
      (product.brand || 'Autres marques') : 
      (product.category || 'Autres produits');
      
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const handleEdit = (productId: string) => {
    if (onEdit) {
      onEdit(productId);
    } else {
      navigate(`/catalog/edit-product/${productId}`);
    }
  };

  const handleDelete = (productId: string) => {
    if (onDelete) onDelete(productId);
  };

  // Sort group names to ensure consistent order with categories first
  const sortedGroupNames = Object.keys(groupedProducts).sort((a, b) => {
    // Special case for "Autres produits" to always be last
    if (a === "Autres produits") return 1;
    if (b === "Autres produits") return -1;
    return a.localeCompare(b);
  });

  const getConfigurationsCount = (product: Product): number => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return product.variant_combination_prices.length;
    }
    return 0;
  };

  const isParentProduct = (product: Product): boolean => {
    return product.is_parent || 
           (product.variants && product.variants.length > 0) || 
           (product.variant_combination_prices && product.variant_combination_prices.length > 0);
  };

  return (
    <div className="space-y-8">
      {sortedGroupNames.map((groupName) => (
        <div key={groupName} className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{groupName}</h2>
            <Badge variant="outline">{groupedProducts[groupName].length}</Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedProducts[groupName].map((product) => {
              const configCount = getConfigurationsCount(product);
              const isParent = isParentProduct(product);
              
              return (
                <Card key={product.id} className="h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium line-clamp-2">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-1 flex items-center gap-2">
                      {product.brand}
                      <VariantIndicator 
                        hasVariants={isParent} 
                        variantsCount={configCount} 
                      />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow pb-2">
                    <div className="aspect-square rounded-md overflow-hidden bg-gray-100 mb-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <span className="text-gray-400">Aucune image</span>
                        </div>
                      )}
                    </div>
                    {!isParent && (
                      <div className="mt-2 text-sm font-medium">
                        {product.monthly_price ? (
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(product.monthly_price)} /mois
                            </span>
                            <span className="text-xs text-gray-500">
                              ou {formatCurrency(product.price || 0)}
                            </span>
                          </div>
                        ) : (
                          <span>{formatCurrency(product.price || 0)}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                  {!readOnly && (
                    <CardFooter className="pt-2 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(product.id)}>
                        <Edit className="h-4 w-4 mr-1" /> Éditer
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
