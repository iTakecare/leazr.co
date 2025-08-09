import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { getUpsellProducts } from "@/services/catalogServiceOptimized";
import { Product } from "@/types/catalog";

interface FrequentlyBoughtTogetherProps {
  productId: string;
  companyId: string;
  category?: string;
  brand?: string;
  currentProduct: Product;
}

const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({
  productId,
  companyId,
  category,
  brand,
  currentProduct
}) => {
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchUpsellProducts = async () => {
      try {
        setLoading(true);
        const products = await getUpsellProducts(companyId, productId, category, brand);
        setUpsellProducts(products.slice(0, 3)); // Limit to 3 products for compactness
      } catch (error) {
        console.error('Error fetching upsell products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpsellProducts();
  }, [companyId, productId, category, brand]);

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const addSelectedToCart = (product: Product) => {
    addToCart({
      product: product,
      quantity: 1,
      duration: 36, // Fixed duration
      selectedOptions: {}
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  const addAllSelectedToCart = () => {
    let addedCount = 0;
    selectedProducts.forEach(productId => {
      const product = upsellProducts.find(p => p.id === productId);
      if (product) {
        addSelectedToCart(product);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      setSelectedProducts([]);
      toast.success(`${addedCount} produit${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} au panier`);
    }
  };

  const getTotalSelectedPrice = () => {
    return selectedProducts.reduce((total, productId) => {
      const product = upsellProducts.find(p => p.id === productId);
      return total + (product?.monthly_price || 0);
    }, 0);
  };

  if (loading || upsellProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
        <ShoppingCart className="h-4 w-4 mr-2 text-blue-600" />
        Acheté fréquemment avec
      </h3>
      
      <div className="space-y-3">
        {upsellProducts.map((product) => (
          <div key={product.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => toggleProductSelection(product.id)}
                  className="sr-only"
                />
                <div
                  onClick={() => toggleProductSelection(product.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                    selectedProducts.includes(product.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {selectedProducts.includes(product.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              
              <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {product.name}
                </p>
                <p className="text-xs text-gray-500">
                  {product.brand}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-gray-800">
                {formatCurrency(product.monthly_price || 0)}/mois
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSelectedToCart(product)}
                className="h-8 w-8 p-0 border-blue-300 hover:bg-blue-50"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        
        {selectedProducts.length > 0 && (
          <div className="pt-3 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-600">Total sélectionné: </span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(getTotalSelectedPrice())}/mois
                </span>
              </div>
              <Button
                onClick={addAllSelectedToCart}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter tout ({selectedProducts.length})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;