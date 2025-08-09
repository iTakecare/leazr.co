import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
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

  const addToCartHandler = (product: Product) => {
    addToCart({
      product: product,
      quantity: 1,
      duration: 36, // Fixed duration
      selectedOptions: {}
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  if (loading || upsellProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 animate-fade-in">
      {/* Header Section */}
      <div className="bg-gradient-subtle rounded-t-xl p-6 border-l-4 border-primary">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produits complémentaires recommandés
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Complétez votre équipement avec ces accessoires sélectionnés
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-card border-x border-b border-border rounded-b-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upsellProducts.map((product, index) => (
            <div
              key={product.id}
              className="group bg-background rounded-lg border border-border shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-4">
                {/* Product Image */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden mx-auto flex-shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Product Info */}
                <div className="text-center mb-4">
                  <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {product.brand}
                  </p>
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(product.monthly_price || 0)}/mois
                  </div>
                </div>
                
                {/* Action Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToCartHandler(product)}
                  className="w-full hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter au panier
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;