
import React from 'react';
import { Product } from '@/types/catalog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface AccordionProductListProps {
  products: Product[];
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  onProductDeleted?: (productId: string) => void;
  groupingOption?: "model" | "brand";
  readOnly?: boolean;
}

const AccordionProductList: React.FC<AccordionProductListProps> = ({ 
  products,
  onEdit,
  onDelete,
  onProductDeleted,
  groupingOption = "model",
  readOnly = false
}) => {
  const groupedProducts = products.reduce((acc, product) => {
    const groupKey = groupingOption === "brand" ? 
      (product.brand || 'Autres marques') : 
      (product.model || 'Autres produits');
    
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
    if (onProductDeleted) onProductDeleted(productId);
  };

  return (
    <Accordion type="multiple" className="space-y-4">
      {Object.entries(groupedProducts).map(([groupKey, groupProducts]) => (
        <AccordionItem key={groupKey} value={groupKey} className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
            <div className="flex items-center">
              <span className="font-medium">{groupKey}</span>
              <Badge variant="outline" className="ml-2">{groupProducts.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="divide-y">
              {groupProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-12 h-12 mr-4 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
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
                          <span className="text-gray-400 text-xs">No img</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <div className="text-sm text-gray-500">
                        {product.brand && (
                          <span className="mr-2">{product.brand}</span>
                        )}
                        <span>{product.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {product.monthly_price ? (
                        <>
                          <div className="font-medium text-primary">
                            {formatCurrency(product.monthly_price)}/mois
                          </div>
                          <div className="text-xs text-gray-500">
                            ou {formatCurrency(product.price || 0)}
                          </div>
                        </>
                      ) : (
                        <div className="font-medium">
                          {formatCurrency(product.price || 0)}
                        </div>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(product.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default AccordionProductList;
