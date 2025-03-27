
import React from 'react';
import { Product } from '@/types/catalog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Separator } from '@/components/ui/separator';

interface ProductGridProps {
  products: Product[];
  groupBy?: string;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  readOnly?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  groupBy = "brand",
  onEdit,
  onDelete,
  readOnly = false
}) => {
  // Group by specified property (brand or model)
  const groupedProducts = products.reduce((acc, product) => {
    const groupKey = groupBy === "model" ? 
      (product.model || 'Autres produits') : 
      (product.brand || 'Autres marques');
      
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const handleEdit = (productId: string) => {
    if (onEdit) onEdit(productId);
  };

  const handleDelete = (productId: string) => {
    if (onDelete) onDelete(productId);
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedProducts).map(([groupName, groupProducts]) => (
        <div key={groupName} className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{groupName}</h2>
            <Badge variant="outline">{groupProducts.length}</Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupProducts.map((product) => (
              <Card key={product.id} className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium line-clamp-2">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{product.category}</CardDescription>
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
